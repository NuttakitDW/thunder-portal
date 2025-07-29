use actix_web::{test, web, App};
use sqlx::sqlite::SqlitePoolOptions;
use thunder_portal::{routes::configure_routes, AppState};
use serde_json::json;

#[actix_rt::test]
async fn test_create_htlc_endpoint() {
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

    // Test creating HTLC with all parameters
    let create_request = json!({
        "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 144,
        "resolver_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    });

    let req = test::TestRequest::post()
        .uri("/v1/htlc/create")
        .set_json(&create_request)
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["htlc_address"].is_string());
    assert!(body["htlc_script"].is_string());
    assert!(body["script_hash"].is_string());
    assert_eq!(body["timeout_blocks"], 144);
    assert!(body["estimated_timeout_timestamp"].is_u64());

    // Test creating HTLC without resolver key
    let simple_request = json!({
        "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 72
    });

    let req = test::TestRequest::post()
        .uri("/v1/htlc/create")
        .set_json(&simple_request)
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    // Test validation errors
    let invalid_request = json!({
        "preimage_hash": "invalid_hash",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 144
    });

    let req = test::TestRequest::post()
        .uri("/v1/htlc/create")
        .set_json(&invalid_request)
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_rt::test]
async fn test_create_htlc_deterministic() {
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

    let create_request = json!({
        "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 144,
        "resolver_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    });

    // Create HTLC twice with same parameters
    let req1 = test::TestRequest::post()
        .uri("/v1/htlc/create")
        .set_json(&create_request)
        .to_request();
    let resp1 = test::call_service(&app, req1).await;
    let body1: serde_json::Value = test::read_body_json(resp1).await;

    let req2 = test::TestRequest::post()
        .uri("/v1/htlc/create")
        .set_json(&create_request)
        .to_request();
    let resp2 = test::call_service(&app, req2).await;
    let body2: serde_json::Value = test::read_body_json(resp2).await;

    // Should generate the same HTLC address and script
    assert_eq!(body1["htlc_address"], body2["htlc_address"]);
    assert_eq!(body1["htlc_script"], body2["htlc_script"]);
    assert_eq!(body1["script_hash"], body2["script_hash"]);
}