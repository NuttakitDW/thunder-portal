use reqwest;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // API configuration
    let api_url = "http://localhost:3000/v1";
    let api_key = "testnet-demo-key";
    
    // Create an HTLC with all parameters
    println!("Creating HTLC with resolver public key...");
    let create_request = json!({
        "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 144,
        "resolver_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    });
    
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/htlc/create", api_url))
        .header("X-API-Key", api_key)
        .json(&create_request)
        .send()
        .await?;
    
    if response.status().is_success() {
        let htlc_response: serde_json::Value = response.json().await?;
        println!("HTLC created successfully!");
        println!("Address: {}", htlc_response["htlc_address"]);
        println!("Script: {}", htlc_response["htlc_script"]);
        println!("Script Hash: {}", htlc_response["script_hash"]);
        println!("Timeout: {} blocks", htlc_response["timeout_blocks"]);
        
        // Convert timestamp to readable date
        if let Some(timestamp) = htlc_response["estimated_timeout_timestamp"].as_u64() {
            let datetime = chrono::DateTime::<chrono::Utc>::from_timestamp(timestamp as i64, 0)
                .unwrap_or_default();
            println!("Estimated timeout: {}", datetime);
        }
    } else {
        let error: serde_json::Value = response.json().await?;
        println!("Error creating HTLC: {:?}", error);
    }
    
    // Create a simple HTLC without resolver (uses user key for both)
    println!("\nCreating simple HTLC without resolver...");
    let simple_request = json!({
        "preimage_hash": "426c6f636b636861696e2069732061776573206f6d650000000000000000000",
        "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "timeout_blocks": 72
    });
    
    let response = client
        .post(format!("{}/htlc/create", api_url))
        .header("X-API-Key", api_key)
        .json(&simple_request)
        .send()
        .await?;
    
    if response.status().is_success() {
        let htlc_response: serde_json::Value = response.json().await?;
        println!("Simple HTLC created successfully!");
        println!("Address: {}", htlc_response["htlc_address"]);
    }
    
    Ok(())
}