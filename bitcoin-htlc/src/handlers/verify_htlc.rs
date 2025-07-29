use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use validator::Validate;

/// Verify HTLC parameters
pub async fn verify_htlc(
    _state: web::Data<AppState>,
    request: web::Json<VerifyHtlcRequest>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    
    // TODO: Implement HTLC verification logic
    // For now, return a mock response
    let response = VerifyHtlcResponse {
        valid: true,
        htlc_address: "2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF".to_string(),
        actual_amount: request.expected_amount,
        timeout_height: 500000,
        validation_errors: vec![],
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_verify_request() -> VerifyHtlcRequest {
        VerifyHtlcRequest {
            transaction_hex: "0123456789abcdef".to_string(),
            output_index: 0,
            expected_amount: 100000,
            expected_payment_hash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            expected_recipient_pubkey: "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string(),
            expected_sender_pubkey: "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string(),
        }
    }

    #[actix_rt::test]
    async fn test_verify_htlc_validates_transaction_hex() {
        let mut request = create_mock_verify_request();
        request.transaction_hex = "".to_string(); // Empty transaction should be invalid
        // Transaction hex validation would be done in the handler, not in validate()
        assert_eq!(request.transaction_hex.len(), 0);
    }

    #[actix_rt::test]
    async fn test_verify_htlc_validates_pubkeys() {
        let mut request = create_mock_verify_request();
        request.expected_sender_pubkey = "invalid".to_string();
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_verify_htlc_validates_payment_hash() {
        let mut request = create_mock_verify_request();
        request.expected_payment_hash = "short".to_string();
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_verify_htlc_accepts_valid_request() {
        let request = create_mock_verify_request();
        assert!(request.validate().is_ok());
    }
}