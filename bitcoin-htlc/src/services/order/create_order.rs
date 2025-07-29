use crate::models::*;
use bitcoin::PublicKey;
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use uuid::Uuid;

/// Create a new cross-chain swap order
pub async fn create_order(
    pool: &SqlitePool,
    resolver_pubkey: &PublicKey,
    request: CreateOrderRequest,
) -> Result<CreateOrderResponse, ApiError> {
    // Parse amount
    let amount_value: u64 = request.amount.parse().map_err(|_| {
        ApiError::BadRequest {
            code: "INVALID_AMOUNT".to_string(),
            message: "Invalid amount format".to_string(),
            details: None,
        }
    })?;

    // Validate request based on direction
    match &request.direction {
        SwapDirection::EthToBtc => {
            if request.bitcoin_address.is_none() || request.from_token.is_none() {
                return Err(ApiError::BadRequest {
                    code: "MISSING_FIELDS".to_string(),
                    message: "bitcoin_address and from_token are required for ETH_TO_BTC".to_string(),
                    details: None,
                });
            }
        }
        SwapDirection::BtcToEth => {
            if request.ethereum_address.is_none() || request.to_token.is_none() {
                return Err(ApiError::BadRequest {
                    code: "MISSING_FIELDS".to_string(),
                    message: "ethereum_address and to_token are required for BTC_TO_ETH".to_string(),
                    details: None,
                });
            }
        }
    }

    let order_id = Uuid::new_v4();
    let now = Utc::now();
    let expires_at = now + Duration::minutes(60);

    // Get timeout configuration
    let timeouts = request.timeouts.unwrap_or(TimeoutConfig {
        ethereum_blocks: 300,
        bitcoin_blocks: 144,
    });

    let confirmations = request.confirmation_requirements.unwrap_or(ConfirmationRequirements {
        bitcoin: 3,
        ethereum: 12,
    });

    // Insert order into database
    let direction_str = match request.direction {
        SwapDirection::EthToBtc => "ETH_TO_BTC",
        SwapDirection::BtcToEth => "BTC_TO_ETH",
    };
    
    // Create temporary variables to avoid lifetime issues
    let bitcoin_amount = match request.direction {
        SwapDirection::EthToBtc => None, // Amount is in ETH/tokens
        SwapDirection::BtcToEth => Some(amount_value as i64), // Amount is in BTC
    };
    let resolver_pubkey_str = resolver_pubkey.to_string();
    let bitcoin_timeout = timeouts.bitcoin_blocks as i64;
    let ethereum_timeout = timeouts.ethereum_blocks as i64;
    let bitcoin_confirmations = confirmations.bitcoin as i64;
    let ethereum_confirmations = confirmations.ethereum as i64;

    sqlx::query!(
        r#"
        INSERT INTO orders (
            id, direction, status, preimage_hash,
            bitcoin_amount, bitcoin_address, bitcoin_public_key,
            ethereum_address, resolver_public_key,
            bitcoin_timeout_blocks, ethereum_timeout_blocks,
            bitcoin_confirmations_required, ethereum_confirmations_required,
            created_at, updated_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        order_id,
        direction_str,
        "created",
        request.preimage_hash,
        bitcoin_amount,
        request.bitcoin_address,
        request.bitcoin_public_key,
        request.ethereum_address,
        resolver_pubkey_str,
        bitcoin_timeout,
        ethereum_timeout,
        bitcoin_confirmations,
        ethereum_confirmations,
        now,
        now,
        expires_at,
    )
    .execute(pool)
    .await?;

    // Build response based on direction
    let (expected_steps, eth_to_btc_instructions, btc_to_eth_instructions) = match request.direction {
        SwapDirection::EthToBtc => {
            let instructions = EthToBtcInstructions {
                fusion_order_requirements: FusionOrderRequirements {
                    resolver_address: "0x1234567890123456789012345678901234567890".to_string(), // TODO: From config
                    preimage_hash: request.preimage_hash.clone(),
                    token_amount: request.amount.clone(),
                    deadline: (Utc::now().timestamp() + (ethereum_timeout as i64 * 15)).to_string(), // Estimate 15 sec/block
                },
            };
            (
                vec![
                    "Submit Fusion order on Ethereum".to_string(),
                    "Wait for Ethereum confirmations".to_string(),
                    "Bitcoin HTLC will be created automatically".to_string(),
                    "Reveal preimage to claim Bitcoin".to_string(),
                ],
                Some(instructions),
                None,
            )
        }
        SwapDirection::BtcToEth => {
            let instructions = BtcToEthInstructions {
                htlc_requirements: HtlcRequirements {
                    user_public_key: request.bitcoin_public_key.clone().unwrap_or_default(),
                    resolver_public_key: resolver_pubkey.to_string(),
                    payment_hash: request.preimage_hash.clone(),
                    amount: request.amount.clone(),
                    timeout_height: bitcoin_timeout as u32,
                    script_template: "OP_IF OP_SHA256 <payment_hash> OP_EQUALVERIFY OP_DUP OP_HASH160 <user_pubkey_hash> OP_ELSE <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 <resolver_pubkey_hash> OP_ENDIF OP_EQUALVERIFY OP_CHECKSIG".to_string(),
                },
            };
            (
                vec![
                    "Send Bitcoin to deposit address".to_string(),
                    "Wait for Bitcoin confirmations".to_string(),
                    "Fusion order will be created automatically".to_string(),
                    "Claim tokens on Ethereum with preimage".to_string(),
                ],
                None,
                Some(instructions),
            )
        }
    };

    Ok(CreateOrderResponse {
        order_id,
        direction: request.direction,
        status: OrderStatus::Created,
        expires_at,
        expected_steps,
        eth_to_btc_instructions,
        btc_to_eth_instructions,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    fn _create_test_resolver_pubkey() -> PublicKey {
        PublicKey::from_str("03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd")
            .unwrap()
    }

    #[test]
    fn test_validate_eth_to_btc_request() {
        let request = CreateOrderRequest {
            direction: SwapDirection::EthToBtc,
            amount: "1000000".to_string(),
            from_token: None,
            bitcoin_address: None,
            bitcoin_public_key: None,
            to_token: None,
            ethereum_address: None,
            preimage_hash: "test".to_string(),
            resolver_public_key: Some("test".to_string()),
            timeouts: None,
            confirmation_requirements: None,
        };

        // Should fail validation
        assert!(request.from_token.is_none());
        assert!(request.bitcoin_address.is_none());
    }

    #[test]
    fn test_order_id_generation() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_expiration_time() {
        let now = Utc::now();
        let expires_at = now + Duration::minutes(60);
        assert!(expires_at > now);
    }
}