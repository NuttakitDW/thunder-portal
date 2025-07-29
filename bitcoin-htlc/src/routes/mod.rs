use actix_web::{web, Scope};
use crate::handlers;

/// Configure all API routes
pub fn configure_routes() -> Scope {
    web::scope("/v1")
        .route("/health", web::get().to(handlers::health_check))
        .route("/orders", web::post().to(handlers::create_order))
        .route("/orders/{order_id}", web::get().to(handlers::get_order))
        .route("/orders/{order_id}/fusion-proof", web::post().to(handlers::submit_fusion_proof))
        .route("/htlc/verify", web::post().to(handlers::verify_htlc))
        .route("/htlc/{htlc_id}/claim", web::post().to(handlers::claim_htlc))
        .route("/htlc/{htlc_id}/refund", web::post().to(handlers::refund_htlc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_rt::test]
    async fn test_routes_configuration() {
        let app = test::init_service(
            App::new()
                .service(configure_routes())
        ).await;

        // Test health endpoint exists
        let req = test::TestRequest::get()
            .uri("/v1/health")
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}