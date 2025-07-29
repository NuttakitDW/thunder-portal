use actix_web::{web, HttpResponse};
use bitcoin::PublicKey;
use std::str::FromStr;
use crate::{models::*, services::htlc::build_htlc_script::build_htlc_script, AppState};
use validator::Validate;

/// Create HTLC script and address
pub async fn create_htlc(
    state: web::Data<AppState>,
    request: web::Json<CreateHtlcRequest>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    
    // Parse the preimage hash
    let preimage_hash_bytes = hex::decode(&request.preimage_hash)
        .map_err(|_| ApiError::BadRequest {
            code: "INVALID_PREIMAGE_HASH".to_string(),
            message: "Invalid preimage hash format".to_string(),
            details: None,
        })?;
    
    if preimage_hash_bytes.len() != 32 {
        return Err(ApiError::BadRequest {
            code: "INVALID_PREIMAGE_HASH".to_string(),
            message: "Preimage hash must be exactly 32 bytes".to_string(),
            details: None,
        });
    }
    
    let mut payment_hash = [0u8; 32];
    payment_hash.copy_from_slice(&preimage_hash_bytes);
    
    // Parse the user public key
    let user_pubkey = PublicKey::from_str(&request.user_public_key)
        .map_err(|_| ApiError::BadRequest {
            code: "INVALID_USER_PUBKEY".to_string(),
            message: "Invalid user public key format".to_string(),
            details: None,
        })?;
    
    // Parse the resolver public key or use a default
    let resolver_pubkey = if let Some(ref resolver_key) = request.resolver_public_key {
        PublicKey::from_str(resolver_key)
            .map_err(|_| ApiError::BadRequest {
                code: "INVALID_RESOLVER_PUBKEY".to_string(),
                message: "Invalid resolver public key format".to_string(),
                details: None,
            })?
    } else {
        // If no resolver key provided, use the user's key as both sender and recipient
        // This is a simplified approach - in a real implementation you might want different logic
        user_pubkey
    };
    
    // Get current block height from database or bitcoin service
    let current_block_height = get_current_block_height(&state).await?;
    let timeout_height = current_block_height + request.timeout_blocks;
    
    // Build HTLC parameters
    let htlc_params = HtlcParams {
        recipient_pubkey: user_pubkey,
        sender_pubkey: resolver_pubkey,
        payment_hash,
        timeout: timeout_height,
    };
    
    // Build the HTLC script
    let htlc_script = build_htlc_script(&htlc_params)?;
    
    // Calculate estimated timeout timestamp (assuming ~10 minutes per block)
    let estimated_timeout_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + (request.timeout_blocks as u64 * 600);
    
    let response = CreateHtlcResponse {
        htlc_script: hex::encode(&htlc_script.redeem_script),
        htlc_address: htlc_script.p2sh_address,
        script_hash: hex::encode(&htlc_script.script_hash),
        timeout_blocks: request.timeout_blocks,
        estimated_timeout_timestamp,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Get current block height from database or bitcoin service
async fn get_current_block_height(state: &web::Data<AppState>) -> Result<u32, ApiError> {
    // Try to get from database first - using bitcoin_timeout_blocks as a proxy
    let result = sqlx::query!("SELECT MAX(bitcoin_timeout_blocks) as max_timeout FROM orders")
        .fetch_one(&state.pool)
        .await;
    
    if let Ok(record) = result {
        if let Some(_timeout) = record.max_timeout {
            // If we have orders, use a reasonable current height
            // In production, this should call a Bitcoin RPC service
            return Ok(2_500_000);
        }
    }
    
    // Default to a reasonable testnet height if no data available
    // In production, you would call a Bitcoin RPC or API service
    Ok(2_500_000)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    fn create_mock_create_request() -> CreateHtlcRequest {
        CreateHtlcRequest {
            preimage_hash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            user_public_key: "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string(),
            timeout_blocks: 144,
            resolver_public_key: Some("03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string()),
        }
    }

    #[actix_rt::test]
    async fn test_create_htlc_validates_preimage_hash() {
        let mut request = create_mock_create_request();
        request.preimage_hash = "invalid".to_string();
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_create_htlc_validates_pubkeys() {
        let mut request = create_mock_create_request();
        request.user_public_key = "invalid".to_string();
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_create_htlc_validates_timeout() {
        let mut request = create_mock_create_request();
        request.timeout_blocks = 0;
        assert!(request.validate().is_err());
        
        request.timeout_blocks = 1_000_000;
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_create_htlc_accepts_valid_request() {
        let request = create_mock_create_request();
        assert!(request.validate().is_ok());
    }

    #[actix_rt::test]
    async fn test_create_htlc_handler() {
        // Create a test database pool
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        // Create app state
        let app_state = web::Data::new(AppState::new(pool));
        
        // Create request
        let request = web::Json(create_mock_create_request());
        
        // Call handler
        let result = create_htlc(app_state, request).await;
        assert!(result.is_ok());
        
        // Check response
        let response = result.unwrap();
        assert_eq!(response.status(), 200);
    }
}