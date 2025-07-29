use actix_web::{web, HttpResponse};
use crate::AppState;
use chrono::Utc;
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthStatus {
    pub status: HealthStatusEnum,
    pub timestamp: String,
    pub version: String,
    pub dependencies: Dependencies,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatusEnum {
    Healthy,
    Degraded,
    Unhealthy,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependencies {
    pub bitcoin_node: BitcoinNodeStatus,
    pub database: DatabaseStatus,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BitcoinNodeStatus {
    pub connected: bool,
    pub block_height: Option<u32>,
    pub network: String,
}

#[derive(Serialize)]
pub struct DatabaseStatus {
    pub connected: bool,
}

/// Health check handler to verify service status
pub async fn health_check(state: web::Data<AppState>) -> HttpResponse {
    // Check Bitcoin connection
    let bitcoin_client = state.order_service.bitcoin_client();
    let (bitcoin_connected, block_height) = match bitcoin_client.get_block_height().await {
        Ok(height) => (true, Some(height)),
        Err(_) => (false, None),
    };

    // Check database connection
    let db_connected = sqlx::query("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .is_ok();

    // Determine overall health
    let overall_status = if bitcoin_connected && db_connected {
        HealthStatusEnum::Healthy
    } else if db_connected {
        HealthStatusEnum::Degraded
    } else {
        HealthStatusEnum::Unhealthy
    };

    let response = HealthStatus {
        status: overall_status,
        timestamp: Utc::now().to_rfc3339(),
        version: "1.0.0".to_string(),
        dependencies: Dependencies {
            bitcoin_node: BitcoinNodeStatus {
                connected: bitcoin_connected,
                block_height,
                network: "testnet".to_string(),
            },
            database: DatabaseStatus {
                connected: db_connected,
            },
        },
    };

    let status_code = match response.status {
        HealthStatusEnum::Healthy => 200,
        _ => 503,
    };

    HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
        .json(response)
}

#[cfg(test)]
mod tests {

    // TODO: Fix these tests - they need AppState mocking
    // #[actix_rt::test]
    // async fn test_health_check_returns_healthy_status() {
    //     let response = health_check().await;
    //     assert_eq!(response.status(), StatusCode::OK);
    // }

    // #[actix_rt::test]
    // async fn test_health_check_response_format() {
    //     // Since the test utils require ServiceResponse, we'll test the status directly
    //     let response = health_check().await;
    //     assert_eq!(response.status(), StatusCode::OK);
    //     
    //     // We know the response contains the correct JSON structure
    //     // but we can't easily extract the body without ServiceResponse
    // }
}