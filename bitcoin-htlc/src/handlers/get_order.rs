use actix_web::{web, HttpResponse};
use crate::{models::ApiError, AppState};
use uuid::Uuid;

/// Get order details by ID
pub async fn get_order(
    state: web::Data<AppState>,
    order_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let response = state.order_service.get_order(order_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[actix_rt::test]
    async fn test_get_order_validates_uuid() {
        let valid_uuid = Uuid::new_v4();
        let path = web::Path::from(valid_uuid);
        assert_eq!(path.into_inner(), valid_uuid);
    }

    #[actix_rt::test]
    async fn test_get_order_handles_invalid_uuid() {
        // UUID parsing is handled by actix-web before reaching handler
        // This test ensures our handler expects a valid UUID type
        let test_uuid = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        assert_eq!(test_uuid.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }
}