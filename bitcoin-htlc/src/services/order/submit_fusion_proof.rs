use crate::models::*;
use crate::services::{bitcoin::BitcoinClient, build_htlc_script};
use bitcoin::PublicKey;
use chrono::Utc;
use sqlx::SqlitePool;
use std::str::FromStr;
use uuid::Uuid;

/// Submit fusion proof for an order
pub async fn submit_fusion_proof(
    _pool: &SqlitePool,
    bitcoin_client: &BitcoinClient,
    order_id: Uuid,
    proof: FusionProofRequest,
) -> Result<FusionProofResponse, ApiError> {
    // TODO: Fix SQLx offline mode
    let _ = (order_id, proof, bitcoin_client); // Acknowledge parameters
    return Err(ApiError::InternalError {
        code: "SQLX_DISABLED".to_string(),
        message: "SQLx queries disabled for testing".to_string(),
        details: None,
    });
    
    #[allow(unreachable_code)]
    {
    // Get order from database
    /*
    let order = sqlx::query_as!(
        Order,
        "SELECT * FROM orders WHERE id = ?",
        order_id
    )
    .fetch_one(pool)
    .await
    .map_err(|_| ApiError::NotFound(format!("Order {} not found", order_id)))?;
    */
    
    // Mock order for testing
    let order = Order {
        id: order_id,
        direction: "ETH_TO_BTC".to_string(),
        status: "created".to_string(),
        preimage_hash: "test_hash".to_string(),
        bitcoin_amount: Some(100000),
        bitcoin_address: Some("tb1qtest".to_string()),
        bitcoin_public_key: Some("03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string()),
        ethereum_address: Some("0xtest".to_string()),
        resolver_public_key: "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string(),
        bitcoin_timeout_blocks: 144,
        ethereum_timeout_blocks: 300,
        bitcoin_confirmations_required: 3,
        ethereum_confirmations_required: 12,
        fusion_order_id: None,
        fusion_order_hash: None,
        htlc_id: None,
        htlc_address: None,
        htlc_redeem_script: None,
        htlc_funding_tx: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        expires_at: chrono::Utc::now() + chrono::Duration::hours(1),
    };
    
    // Verify order is in correct state
    if order.status != "created" && order.status != "awaiting_fusion_proof" {
        return Err(ApiError::BadRequest {
            code: "INVALID_ORDER_STATE".to_string(),
            message: format!("Order is in {} state, cannot submit fusion proof", order.status),
            details: None,
        });
    }
    
    // Parse bitcoin public key
    let bitcoin_pubkey = PublicKey::from_str(
        order.bitcoin_public_key.as_ref()
            .ok_or_else(|| ApiError::InternalError {
                code: "MISSING_BITCOIN_KEY".to_string(),
                message: "Bitcoin public key not set".to_string(),
                details: None,
            })?
    )?;
    
    let resolver_pubkey = PublicKey::from_str(&order.resolver_public_key)?;
    
    // Get current block height
    let current_block_height = bitcoin_client.get_block_height().await?;
    let _timeout_height = current_block_height + order.bitcoin_timeout_blocks as u32;
    
    // Create HTLC
    let payment_hash = hex::decode(&order.preimage_hash)
        .map_err(|_| ApiError::BadRequest {
            code: "INVALID_PREIMAGE_HASH".to_string(),
            message: "Invalid preimage hash".to_string(),
            details: None,
        })?;
    let mut payment_hash_array = [0u8; 32];
    payment_hash_array.copy_from_slice(&payment_hash);
    
    let params = HtlcParams {
        sender_pubkey: resolver_pubkey,
        recipient_pubkey: bitcoin_pubkey,
        payment_hash: payment_hash_array,
        timeout: order.bitcoin_timeout_blocks as u32,
    };
    
    let htlc_script = build_htlc_script(&params)?;
    
    // Update order with HTLC details
    let redeem_script_hex = hex::encode(&htlc_script.redeem_script);
    let _updated_at = Utc::now();
    
    /*
    sqlx::query!(
        r#"
        UPDATE orders SET
            status = ?,
            bitcoin_htlc_address = ?,
            bitcoin_htlc_redeem_script = ?,
            ethereum_fusion_order_id = ?,
            ethereum_fusion_order_hash = ?,
            updated_at = ?
        WHERE id = ?
        "#,
        "bitcoin_htlc_created",
        htlc_script.p2sh_address,
        redeem_script_hex,
        proof.fusion_order_id,
        proof.fusion_order_hash,
        updated_at,
        order_id
    )
    .execute(pool)
    .await?;
    */
    
    Ok(FusionProofResponse {
        accepted: true,
        next_step: "Send Bitcoin to HTLC address".to_string(),
        bitcoin_htlc: Some(BitcoinHtlcInfo {
            htlc_id: Uuid::new_v4(),
            address: htlc_script.p2sh_address,
            redeem_script: redeem_script_hex,
            funding_amount: order.bitcoin_amount.unwrap_or(100000) as u64,
        }),
    })
    }
}

use chrono;

#[cfg(test)]
mod tests {

    #[test]
    fn test_payment_hash_decoding() {
        let valid_hash = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let decoded = hex::decode(valid_hash).unwrap();
        assert_eq!(decoded.len(), 32);
    }

    #[test]
    fn test_invalid_payment_hash_length() {
        let invalid_hash = "1234"; // Too short
        let decoded = hex::decode(invalid_hash).unwrap();
        assert_ne!(decoded.len(), 32);
    }

    #[test]
    fn test_timeout_calculation() {
        let current_height = 750000;
        let timeout_blocks = 144;
        let timeout_height = current_height + timeout_blocks;
        assert_eq!(timeout_height, 750144);
    }
}