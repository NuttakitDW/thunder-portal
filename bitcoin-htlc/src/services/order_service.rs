use crate::models::*;
use crate::services::{bitcoin_client::BitcoinClient, htlc_builder::HtlcBuilder};
use bitcoin::{Network, PublicKey};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use std::env;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Clone)]
pub struct OrderService {
    pool: SqlitePool,
    bitcoin_client: BitcoinClient,
    network: Network,
    resolver_pubkey: PublicKey,
}

impl OrderService {
    pub fn new(pool: SqlitePool, bitcoin_client: BitcoinClient) -> Self {
        let network = match env::var("BITCOIN_NETWORK").as_deref() {
            Ok("mainnet") => Network::Bitcoin,
            Ok("testnet") | _ => Network::Testnet,
        };

        let resolver_pubkey_hex = env::var("RESOLVER_PUBLIC_KEY")
            .expect("RESOLVER_PUBLIC_KEY must be set");
        let resolver_pubkey = PublicKey::from_str(&resolver_pubkey_hex)
            .expect("Invalid RESOLVER_PUBLIC_KEY");

        Self {
            pool,
            bitcoin_client,
            network,
            resolver_pubkey,
        }
    }

    pub async fn create_order(&self, request: CreateOrderRequest) -> Result<CreateOrderResponse, ApiError> {
        // Validate request based on direction
        match &request.direction {
            SwapDirection::EthToBtc => {
                if request.bitcoin_amount.is_none() || request.bitcoin_address.is_none() {
                    return Err(ApiError::BadRequest(
                        "bitcoin_amount and bitcoin_address are required for ETH_TO_BTC".to_string()
                    ));
                }
            }
            SwapDirection::BtcToEth => {
                if request.to_token.is_none() || request.ethereum_address.is_none() {
                    return Err(ApiError::BadRequest(
                        "to_token and ethereum_address are required for BTC_TO_ETH".to_string()
                    ));
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
            request.bitcoin_amount.map(|a| a as i64),
            request.bitcoin_address,
            request.bitcoin_public_key,
            request.ethereum_address,
            self.resolver_pubkey.to_string(),
            timeouts.bitcoin_blocks as i32,
            timeouts.ethereum_blocks as i32,
            confirmations.bitcoin as i32,
            confirmations.ethereum as i32,
            now,
            now,
            expires_at,
        )
        .execute(&self.pool)
        .await?;

        // Build response based on direction
        let (expected_steps, eth_to_btc_instructions, btc_to_eth_instructions) = match request.direction {
            SwapDirection::EthToBtc => {
                let steps = vec![
                    "Create Fusion+ order on Ethereum".to_string(),
                    format!("Submit Fusion+ proof to /orders/{}/fusion-proof", order_id),
                    "Wait for Bitcoin HTLC creation".to_string(),
                    "Claim Bitcoin after resolver reveals preimage".to_string(),
                ];

                let instructions = Some(EthToBtcInstructions {
                    fusion_order_requirements: FusionOrderRequirements {
                        resolver_address: env::var("FUSION_RESOLVER_ADDRESS")
                            .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string()),
                        preimage_hash: request.preimage_hash.clone(),
                        token_amount: "1000000000000000000".to_string(), // 1 ETH example
                        deadline: (Utc::now() + Duration::hours(1)).timestamp().to_string(),
                    },
                });

                (steps, instructions, None)
            }
            SwapDirection::BtcToEth => {
                let steps = vec![
                    "Create Bitcoin HTLC with specified parameters".to_string(),
                    "Fund the HTLC address".to_string(),
                    format!("Verify HTLC at /htlc/verify"),
                    "Thunder Portal will fill Fusion+ order".to_string(),
                    "Receive tokens on Ethereum".to_string(),
                ];

                let current_height = self.bitcoin_client.get_block_height().await?;
                let timeout_height = current_height + timeouts.bitcoin_blocks;

                let instructions = Some(BtcToEthInstructions {
                    htlc_requirements: HtlcRequirements {
                        user_public_key: request.bitcoin_public_key.clone()
                            .unwrap_or_else(|| "user_pubkey_required".to_string()),
                        resolver_public_key: self.resolver_pubkey.to_string(),
                        payment_hash: request.preimage_hash.clone(),
                        amount: "100000".to_string(), // 0.001 BTC example
                        timeout_height,
                        script_template: "OP_IF OP_SHA256 <payment_hash> OP_EQUALVERIFY <user_pubkey> OP_CHECKSIG OP_ELSE <timeout> OP_CLTV OP_DROP <resolver_pubkey> OP_CHECKSIG OP_ENDIF".to_string(),
                    },
                });

                (steps, None, instructions)
            }
        };

        Ok(CreateOrderResponse {
            order_id,
            direction: request.direction,
            status: OrderStatus::Created,
            expected_steps,
            expires_at,
            eth_to_btc_instructions,
            btc_to_eth_instructions,
        })
    }

    pub async fn get_order(&self, order_id: Uuid) -> Result<OrderDetails, ApiError> {
        let order = sqlx::query_as!(
            Order,
            "SELECT * FROM orders WHERE id = ?",
            order_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|_| ApiError::NotFound(format!("Order {} not found", order_id)))?;

        // Convert stored values to response format
        let direction = match order.direction.as_str() {
            "ETH_TO_BTC" => SwapDirection::EthToBtc,
            "BTC_TO_ETH" => SwapDirection::BtcToEth,
            _ => return Err(ApiError::InternalError("Invalid direction in database".to_string())),
        };

        let status = self.parse_order_status(&order.status)?;

        let htlc_details = if let (Some(htlc_id), Some(address), Some(script)) = 
            (order.htlc_id, order.htlc_address.clone(), order.htlc_redeem_script.clone()) {
            Some(HtlcDetails {
                htlc_id,
                address,
                redeem_script: script,
                funding_tx: order.htlc_funding_tx.clone(),
                claim_tx: None, // TODO: Track claim transactions
                refund_tx: None, // TODO: Track refund transactions
            })
        } else {
            None
        };

        let fusion_order = if let (Some(order_id), Some(order_hash)) = 
            (order.fusion_order_id.clone(), order.fusion_order_hash.clone()) {
            Some(FusionOrder {
                order_id,
                order_hash,
                status: "pending".to_string(), // TODO: Track Fusion+ order status
            })
        } else {
            None
        };

        Ok(OrderDetails {
            order_id: order.id,
            direction,
            status,
            amounts: OrderAmounts {
                bitcoin_amount: order.bitcoin_amount.map(|a| a as u64),
                ethereum_amount: None, // TODO: Track Ethereum amounts
            },
            addresses: OrderAddresses {
                bitcoin_address: order.bitcoin_address,
                ethereum_address: order.ethereum_address,
            },
            htlc_details,
            fusion_order,
            timestamps: OrderTimestamps {
                created_at: order.created_at,
                updated_at: order.updated_at,
                expires_at: order.expires_at,
            },
            confirmations: OrderConfirmations {
                bitcoin_required: order.bitcoin_confirmations_required as u32,
                bitcoin_current: 0, // TODO: Track confirmations
                ethereum_required: order.ethereum_confirmations_required as u32,
                ethereum_current: 0, // TODO: Track confirmations
            },
        })
    }

    pub async fn submit_fusion_proof(
        &self,
        order_id: Uuid,
        proof: FusionProofRequest,
    ) -> Result<FusionProofResponse, ApiError> {
        // Update order with Fusion+ proof
        sqlx::query!(
            r#"
            UPDATE orders 
            SET fusion_order_id = ?, fusion_order_hash = ?, 
                status = 'fusion_proof_verified', updated_at = ?
            WHERE id = ?
            "#,
            proof.fusion_order_id,
            proof.fusion_order_hash,
            Utc::now(),
            order_id
        )
        .execute(&self.pool)
        .await?;

        // For ETH_TO_BTC, create Bitcoin HTLC
        let order = self.get_order_raw(order_id).await?;
        
        let bitcoin_htlc = if order.direction == "ETH_TO_BTC" {
            let htlc_info = self.create_bitcoin_htlc(&order).await?;
            Some(htlc_info)
        } else {
            None
        };

        Ok(FusionProofResponse {
            accepted: true,
            next_step: match order.direction.as_str() {
                "ETH_TO_BTC" => "Bitcoin HTLC will be created and funded".to_string(),
                "BTC_TO_ETH" => "Submit your Bitcoin HTLC for verification".to_string(),
                _ => "Processing".to_string(),
            },
            bitcoin_htlc,
        })
    }

    async fn create_bitcoin_htlc(&self, order: &Order) -> Result<BitcoinHtlcInfo, ApiError> {
        let htlc_id = Uuid::new_v4();
        
        // Parse public keys
        let user_pubkey = PublicKey::from_str(
            order.bitcoin_public_key.as_ref()
                .ok_or_else(|| ApiError::InternalError("Missing bitcoin public key".to_string()))?
        )?;

        let payment_hash = hex::decode(&order.preimage_hash)
            .map_err(|_| ApiError::InternalError("Invalid payment hash".to_string()))?
            .try_into()
            .map_err(|_| ApiError::InternalError("Payment hash wrong length".to_string()))?;

        // Create HTLC
        let params = HtlcParams {
            recipient_pubkey: user_pubkey,
            sender_pubkey: self.resolver_pubkey,
            payment_hash,
            timeout: order.bitcoin_timeout_blocks as u32,
        };

        let htlc_script = HtlcBuilder::build_htlc_script(&params)?;

        // Update order with HTLC details
        sqlx::query!(
            r#"
            UPDATE orders 
            SET htlc_id = ?, htlc_address = ?, htlc_redeem_script = ?, 
                status = 'bitcoin_htlc_created', updated_at = ?
            WHERE id = ?
            "#,
            htlc_id,
            htlc_script.p2sh_address,
            hex::encode(&htlc_script.redeem_script),
            Utc::now(),
            order.id
        )
        .execute(&self.pool)
        .await?;

        Ok(BitcoinHtlcInfo {
            htlc_id,
            address: htlc_script.p2sh_address,
            redeem_script: hex::encode(&htlc_script.redeem_script),
            funding_amount: order.bitcoin_amount.unwrap_or(100000) as u64,
        })
    }

    async fn get_order_raw(&self, order_id: Uuid) -> Result<Order, ApiError> {
        sqlx::query_as!(
            Order,
            "SELECT * FROM orders WHERE id = ?",
            order_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|_| ApiError::NotFound(format!("Order {} not found", order_id)))
    }

    fn parse_order_status(&self, status: &str) -> Result<OrderStatus, ApiError> {
        match status {
            "created" => Ok(OrderStatus::Created),
            "awaiting_fusion_proof" => Ok(OrderStatus::AwaitingFusionProof),
            "fusion_proof_verified" => Ok(OrderStatus::FusionProofVerified),
            "bitcoin_htlc_created" => Ok(OrderStatus::BitcoinHtlcCreated),
            "bitcoin_htlc_funded" => Ok(OrderStatus::BitcoinHtlcFunded),
            "bitcoin_htlc_confirmed" => Ok(OrderStatus::BitcoinHtlcConfirmed),
            "fusion_order_fillable" => Ok(OrderStatus::FusionOrderFillable),
            "fusion_order_filling" => Ok(OrderStatus::FusionOrderFilling),
            "fusion_order_filled" => Ok(OrderStatus::FusionOrderFilled),
            "preimage_revealed" => Ok(OrderStatus::PreimageRevealed),
            "bitcoin_htlc_claimed" => Ok(OrderStatus::BitcoinHtlcClaimed),
            "completed" => Ok(OrderStatus::Completed),
            "expired" => Ok(OrderStatus::Expired),
            "failed" => Ok(OrderStatus::Failed),
            _ => Err(ApiError::InternalError(format!("Unknown order status: {}", status))),
        }
    }
}