use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use validator::Validate;
use uuid::Uuid;

/// Submit fusion proof for an order
pub async fn submit_fusion_proof(
    state: web::Data<AppState>,
    order_id: web::Path<Uuid>,
    request: web::Json<FusionProofRequest>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    let response = state.order_service
        .submit_fusion_proof(order_id.into_inner(), request.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_fusion_proof() -> FusionProofRequest {
        FusionProofRequest {
            fusion_order_id: "test-order-id".to_string(),
            fusion_order_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            fusion_order_signature: format!("0x{}", "a".repeat(130)), // Mock signature
            fusion_order_data: None,
        }
    }

    #[actix_rt::test]
    async fn test_fusion_proof_validates_order_hash() {
        let mut proof = create_mock_fusion_proof();
        proof.fusion_order_hash = "invalid".to_string();
        assert!(proof.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_fusion_proof_validates_signature() {
        let mut proof = create_mock_fusion_proof();
        proof.fusion_order_signature = "invalid".to_string();
        assert!(proof.validate().is_err());
    }

    #[actix_rt::test]
    async fn test_fusion_proof_accepts_valid_request() {
        let proof = create_mock_fusion_proof();
        assert!(proof.validate().is_ok());
    }
}