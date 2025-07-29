use actix_cors::Cors;
use actix_web::{middleware, App, HttpServer};
use dotenv::dotenv;
use env_logger::Env;
use log::info;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;
use thunder_portal::{AppState, configure_app, middleware::ApiKeyAuth};

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

    // Setup database
    info!("Connecting to database...");
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Create application state
    let app_state = AppState::new(pool);

    info!("Starting HTTP server on {}:{}", host, port);

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|_, _| true)
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec!["Content-Type", "Authorization"])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .wrap(ApiKeyAuth)
            .configure(|cfg| configure_app(cfg, app_state.clone()))
    })
    .bind(format!("{}:{}", host, port))?
    .run()
    .await
}