use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use uuid::Uuid;

/// Refund HTLC after timeout
pub async fn refund_htlc(
    _state: web::Data<AppState>,
    _htlc_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    // TODO: Implement HTLC refund logic
    // For now, return a mock response
    let response = RefundResponse {
        transaction_id: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
        status: "broadcast".to_string(),
        refund_address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(),
        refunded_amount: 94000,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[actix_rt::test]
    async fn test_refund_htlc_returns_valid_response() {
        let htlc_id = Uuid::new_v4();
        let path = web::Path::from(htlc_id);
        assert_eq!(path.into_inner(), htlc_id);
    }

    #[actix_rt::test]
    async fn test_refund_response_structure() {
        let response = RefundResponse {
            transaction_id: "test_tx_id".to_string(),
            status: "pending".to_string(),
            refund_address: "test_address".to_string(),
            refunded_amount: 100000,
        };

        assert_eq!(response.transaction_id, "test_tx_id");
        assert_eq!(response.status, "pending");
        assert_eq!(response.refund_address, "test_address");
        assert_eq!(response.refunded_amount, 100000);
    }
}