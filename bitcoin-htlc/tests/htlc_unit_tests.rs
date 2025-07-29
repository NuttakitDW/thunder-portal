use bitcoin::{PublicKey, secp256k1::{Secp256k1, SecretKey}};
use std::str::FromStr;
use thunder_portal::services::htlc_builder::HtlcBuilder;
use thunder_portal::models::htlc::HtlcParams;

#[test]
fn test_htlc_script_creation() {
    let secp = Secp256k1::new();
    
    // Generate test keys
    let sender_sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
    let recipient_sk = SecretKey::from_slice(&[2u8; 32]).unwrap();
    
    let sender_pubkey = PublicKey {
        inner: sender_sk.public_key(&secp),
        compressed: true,
    };
    let recipient_pubkey = PublicKey {
        inner: recipient_sk.public_key(&secp),
        compressed: true,
    };
    
    // Generate payment hash
    let (_, payment_hash) = HtlcBuilder::generate_preimage();
    
    // Create HTLC parameters
    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: 500_000,
    };
    
    // Build script
    let script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Verify we got a P2SH address
    assert!(script.p2sh_address.starts_with("2") || script.p2sh_address.starts_with("tb"));
    assert!(!script.redeem_script.is_empty());
    assert_eq!(script.script_hash.len(), 32);
}

#[test]
fn test_preimage_generation() {
    let (preimage, payment_hash) = HtlcBuilder::generate_preimage();
    
    // Verify sizes
    assert_eq!(preimage.len(), 32);
    assert_eq!(payment_hash.len(), 32);
    
    // Verify the hash matches
    let computed_hash = HtlcBuilder::hash_preimage(&preimage);
    assert_eq!(payment_hash, computed_hash);
}

#[test]
fn test_htlc_script_with_real_keys() {
    let recipient_pubkey = PublicKey::from_str(
        "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();
    
    let sender_pubkey = PublicKey::from_str(
        "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();

    let (_, payment_hash) = HtlcBuilder::generate_preimage();

    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: 500000,
    };

    let script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Verify P2SH address format for testnet
    assert!(script.p2sh_address.starts_with("2") || script.p2sh_address.starts_with("tb"));
    assert!(!script.redeem_script.is_empty());
    assert_eq!(script.script_hash.len(), 32);
    
    println!("HTLC Address: {}", script.p2sh_address);
    println!("Redeem Script Length: {}", script.redeem_script.len());
}

#[test] 
fn test_htlc_script_deterministic() {
    let recipient_pubkey = PublicKey::from_str(
        "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();
    
    let sender_pubkey = PublicKey::from_str(
        "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
    ).unwrap();

    // Use a fixed payment hash
    let payment_hash = [0x42u8; 32];

    let params = HtlcParams {
        recipient_pubkey: recipient_pubkey.clone(),
        sender_pubkey: sender_pubkey.clone(),
        payment_hash,
        timeout: 500000,
    };

    // Build script twice with same parameters
    let script1 = HtlcBuilder::build_htlc_script(&params).unwrap();
    let script2 = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Should produce identical results
    assert_eq!(script1.p2sh_address, script2.p2sh_address);
    assert_eq!(script1.redeem_script, script2.redeem_script);
    assert_eq!(script1.script_hash, script2.script_hash);
}