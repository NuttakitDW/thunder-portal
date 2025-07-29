use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use dotenv::dotenv;
use env_logger::Env;
use log::info;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

mod api;
mod models;
mod services;
mod utils;

use api::{claim_htlc, create_order, get_order, refund_htlc, submit_fusion_proof, verify_htlc, health_check};
use services::{bitcoin_client::BitcoinClient, order_service::OrderService};

#[derive(Clone)]
pub struct AppState {
    pub order_service: OrderService,
    pub bitcoin_client: BitcoinClient,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    info!("Starting Thunder Portal Bitcoin HTLC Service...");

    // Get configuration from environment
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let bitcoin_api_url = env::var("BITCOIN_API_URL").expect("BITCOIN_API_URL must be set");

    // Setup database
    info!("Connecting to database...");
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Initialize services
    let bitcoin_client = BitcoinClient::new(bitcoin_api_url);
    
    // Test Bitcoin connection
    match bitcoin_client.get_block_height().await {
        Ok(height) => info!("Connected to Bitcoin testnet at height: {}", height),
        Err(e) => {
            log::error!("Failed to connect to Bitcoin network: {}", e);
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to connect to Bitcoin network",
            ));
        }
    }

    let order_service = OrderService::new(pool.clone(), bitcoin_client.clone());

    let app_state = web::Data::new(AppState {
        order_service,
        bitcoin_client,
    });

    let bind_address = format!("{}:{}", host, port);
    info!("Starting server at http://{}", bind_address);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .service(
                web::scope("/v1")
                    .route("/health", web::get().to(health_check))
                    .route("/orders", web::post().to(create_order))
                    .route("/orders/{order_id}", web::get().to(get_order))
                    .route("/orders/{order_id}/fusion-proof", web::post().to(submit_fusion_proof))
                    .route("/htlc/verify", web::post().to(verify_htlc))
                    .route("/htlc/{htlc_id}/claim", web::post().to(claim_htlc))
                    .route("/htlc/{htlc_id}/refund", web::post().to(refund_htlc))
            )
    })
    .bind(bind_address)?
    .run()
    .await
}