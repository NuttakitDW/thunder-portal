pub mod models;
pub mod handlers;
pub mod routes;
pub mod services;
pub mod utils;

use actix_web::web;
use sqlx::SqlitePool;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub order_service: services::order::OrderService,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        let bitcoin_client = services::bitcoin::BitcoinClient::new();
        let order_service = services::order::OrderService::new(pool.clone(), bitcoin_client);
        
        Self {
            pool,
            order_service,
        }
    }
}

/// Configure the application
pub fn configure_app(cfg: &mut web::ServiceConfig, state: AppState) {
    cfg.app_data(web::Data::new(state))
        .service(routes::configure_routes());
}