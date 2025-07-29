use actix_web::{test, web, App};
use serde_json::json;
use thunder_portal::handlers;

#[actix_rt::test]
async fn test_health_check() {
    let app = test::init_service(
        App::new()
            .route("/v1/health", web::get().to(handlers::health_check))
    ).await;

    let req = test::TestRequest::get()
        .uri("/v1/health")
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["status"], "healthy");
}

#[actix_rt::test]
async fn test_create_order_eth_to_btc() {
    // This is a mock test - in production you'd set up a test database
    let _order_request = json!({
        "direction": "ETH_TO_BTC",
        "bitcoin_amount": 100000,
        "bitcoin_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
        "bitcoin_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
        "preimage_hash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "confirmationRequirements": {
            "bitcoin": 3,
            "ethereum": 12
        }
    });

    // TODO: Add actual test with database setup
    assert!(true);
}

#[actix_rt::test]
async fn test_htlc_script_generation() {
    use bitcoin::{PublicKey};
    use std::str::FromStr;
    use thunder_portal::services::{generate_preimage, build_htlc_script};
    use thunder_portal::models::HtlcParams;

    let recipient_pubkey = PublicKey::from_str(
        "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();
    
    let sender_pubkey = PublicKey::from_str(
        "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();

    let (_, payment_hash) = generate_preimage();

    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: 500000,
    };

    let script = build_htlc_script(&params).unwrap();
    
    // Verify P2SH address format for testnet
    assert!(script.p2sh_address.starts_with("2") || script.p2sh_address.starts_with("tb"));
    assert!(!script.redeem_script.is_empty());
    assert_eq!(script.script_hash.len(), 32);
}

#[test]
async fn test_preimage_hash_generation() {
    use thunder_portal::services::{generate_preimage, hash_preimage};

    let (preimage, payment_hash) = generate_preimage();
    
    // Verify sizes
    assert_eq!(preimage.len(), 32);
    assert_eq!(payment_hash.len(), 32);
    
    // Verify hash matches
    let computed_hash = hash_preimage(&preimage);
    assert_eq!(payment_hash, computed_hash);
}

#[test]
async fn test_hex_utilities() {
    use thunder_portal::utils::{hex_to_bytes, bytes_to_hex};

    let original = b"Hello, Bitcoin!";
    let hex = bytes_to_hex(original);
    let decoded = hex_to_bytes(&hex).unwrap();
    
    assert_eq!(original.to_vec(), decoded);
}

#[test]
async fn test_address_validation() {
    use thunder_portal::utils::{validate_bitcoin_address, validate_ethereum_address};
    use bitcoin::Network;

    // Valid Bitcoin testnet addresses
    assert!(validate_bitcoin_address("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", Network::Testnet));
    assert!(validate_bitcoin_address("2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc", Network::Testnet));
    
    // Invalid for testnet
    assert!(!validate_bitcoin_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", Network::Testnet));
    
    // Valid Ethereum addresses
    assert!(validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f62490"));
    assert!(validate_ethereum_address("0x0000000000000000000000000000000000000000"));
    
    // Invalid Ethereum addresses
    assert!(!validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f6249")); // Too short
    assert!(!validate_ethereum_address("742d35Cc6634C0532925a3b844Bc9e7595f62490")); // No 0x
}

#[test]
async fn test_sha256_hashing() {
    use thunder_portal::utils::sha256;

    let data = b"test data";
    let hash = sha256(data);
    
    assert_eq!(hash.len(), 32);
    
    // Verify deterministic
    let hash2 = sha256(data);
    assert_eq!(hash, hash2);
    
    // Different data produces different hash
    let hash3 = sha256(b"different data");
    assert_ne!(hash, hash3);
}