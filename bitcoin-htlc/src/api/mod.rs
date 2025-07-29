use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use validator::Validate;

pub async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "Thunder Portal Bitcoin HTLC Service"
    }))
}

pub async fn create_order(
    state: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse, ApiError> {
    req.validate()?;
    let response = state.order_service.create_order(req.into_inner()).await?;
    Ok(HttpResponse::Created().json(response))
}

pub async fn get_order(
    state: web::Data<AppState>,
    order_id: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, ApiError> {
    let response = state.order_service.get_order(order_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(response))
}

pub async fn submit_fusion_proof(
    state: web::Data<AppState>,
    order_id: web::Path<uuid::Uuid>,
    req: web::Json<FusionProofRequest>,
) -> Result<HttpResponse, ApiError> {
    req.validate()?;
    let response = state.order_service
        .submit_fusion_proof(order_id.into_inner(), req.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(response))
}

pub async fn verify_htlc(
    _state: web::Data<AppState>,
    req: web::Json<VerifyHtlcRequest>,
) -> Result<HttpResponse, ApiError> {
    req.validate()?;
    
    // TODO: Implement HTLC verification logic
    // For now, return a mock response
    let response = VerifyHtlcResponse {
        valid: true,
        htlc_address: "2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF".to_string(),
        actual_amount: req.expected_amount,
        timeout_height: 500000,
        validation_errors: vec![],
    };
    
    Ok(HttpResponse::Ok().json(response))
}

pub async fn claim_htlc(
    _state: web::Data<AppState>,
    htlc_id: web::Path<uuid::Uuid>,
    req: web::Json<ClaimRequest>,
) -> Result<HttpResponse, ApiError> {
    req.validate()?;
    
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

pub async fn refund_htlc(
    _state: web::Data<AppState>,
    _htlc_id: web::Path<uuid::Uuid>,
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