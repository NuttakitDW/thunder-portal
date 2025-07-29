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
        .route("/transactions/{tx_id}/status", web::get().to(handlers::get_transaction_status))
        .route("/webhooks", web::post().to(handlers::register_webhook))
        .route("/fees/estimate", web::get().to(handlers::estimate_fees))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use sqlx::sqlite::SqlitePoolOptions;
    use crate::AppState;

    #[actix_rt::test]
    async fn test_routes_configuration() {
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
        let app_state = AppState::new(pool);

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(app_state))
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