use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use validator::Validate;
use uuid::Uuid;

/// Claim HTLC with preimage
pub async fn claim_htlc(
    _state: web::Data<AppState>,
    _htlc_id: web::Path<Uuid>,
    request: web::Json<ClaimRequest>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    
    // TODO: Implement HTLC claiming logic
    // For now, return a mock response
    let response = ClaimResponse {
        transaction_id: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
        status: "broadcast".to_string(),
        claim_address: "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7".to_string(),
        claimed_amount: 95000,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_claim_request() -> ClaimRequest {
        ClaimRequest {
            preimage: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string(),
            bitcoin_tx_hex: None,
        }
    }

    #[actix_rt::test]
    async fn test_claim_htlc_validates_preimage() {
        let mut request = create_mock_claim_request();
        request.preimage = "short".to_string();
        assert!(request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_claim_htlc_accepts_valid_request() {
        let request = create_mock_claim_request();
        assert!(request.validate().is_ok());
    }

    #[actix_rt::test]
    async fn test_claim_htlc_bitcoin_tx_optional() {
        let mut request = create_mock_claim_request();
        request.bitcoin_tx_hex = Some("0123456789abcdef".to_string());
        assert!(request.validate().is_ok());
    }
}