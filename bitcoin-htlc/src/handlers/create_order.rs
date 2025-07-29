use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use validator::Validate;

/// Create a new cross-chain swap order
pub async fn create_order(
    state: web::Data<AppState>,
    request: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    let response = state.order_service.create_order(request.into_inner()).await?;
    Ok(HttpResponse::Created().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_order_request() -> CreateOrderRequest {
        CreateOrderRequest {
            direction: crate::models::SwapDirection::EthToBtc,
            amount: "1000000000000000000".to_string(), // 1 ETH in wei
            from_token: Some(crate::models::TokenInfo {
                symbol: "ETH".to_string(),
                address: "0x0000000000000000000000000000000000000000".to_string(),
            }),
            bitcoin_address: Some("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string()),
            bitcoin_public_key: Some("03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string()),
            to_token: None,
            ethereum_address: None,
            preimage_hash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            resolver_public_key: Some("03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd".to_string()),
            timeouts: None,
            confirmation_requirements: None,
        }
    }

    #[actix_rt::test]
    async fn test_create_order_validates_request() {
        let mut invalid_request = create_mock_order_request();
        invalid_request.amount = "abc".to_string(); // Invalid amount (not numeric)
        invalid_request.bitcoin_address = Some("invalid".to_string());
        invalid_request.bitcoin_public_key = Some("invalid".to_string());
        invalid_request.preimage_hash = "short".to_string();

        assert!(invalid_request.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_create_order_accepts_valid_request() {
        let valid_request = create_mock_order_request();
        assert!(valid_request.validate().is_ok());
    }
}