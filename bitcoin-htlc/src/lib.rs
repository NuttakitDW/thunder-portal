pub mod api;
pub mod models;
pub mod services;
pub mod utils;

pub use models::*;

#[derive(Clone)]
pub struct AppState {
    pub order_service: services::order_service::OrderService,
    pub bitcoin_client: services::bitcoin_client::BitcoinClient,
}