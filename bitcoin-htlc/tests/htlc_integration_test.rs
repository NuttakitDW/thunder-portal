use bitcoin::{
    Amount, Network, OutPoint, PublicKey, Address,
    secp256k1::{Secp256k1, SecretKey},
};
use std::str::FromStr;
use thunder_portal::services::{
    htlc_builder::HtlcBuilder,
    transaction_builder::TransactionBuilder,
};
use thunder_portal::models::htlc::HtlcParams;

/// Integration test demonstrating the full HTLC atomic swap flow
#[test]
fn test_full_htlc_atomic_swap_flow() {
    println!("\n=== HTLC Atomic Swap Integration Test ===\n");
    
    let secp = Secp256k1::new();
    let network = Network::Testnet;
    
    // Step 1: Setup participants
    println!("Step 1: Setting up Alice (sender) and Bob (recipient)");
    
    // Alice (sender) - wants to send BTC
    let alice_sk = SecretKey::from_slice(&[0xAA; 32]).unwrap();
    let alice_pubkey = PublicKey {
        inner: alice_sk.public_key(&secp),
        compressed: true,
    };
    let alice_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
        .unwrap()
        .require_network(network)
        .unwrap();
    
    // Bob (recipient) - will receive BTC after revealing preimage
    let bob_sk = SecretKey::from_slice(&[0xBB; 32]).unwrap();
    let bob_pubkey = PublicKey {
        inner: bob_sk.public_key(&secp),
        compressed: true,
    };
    let bob_address = Address::from_str("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7")
        .unwrap()
        .require_network(network)
        .unwrap();
    
    println!("  Alice public key: {}", alice_pubkey);
    println!("  Bob public key: {}", bob_pubkey);
    
    // Step 2: Bob generates the secret preimage
    println!("\nStep 2: Bob generates secret preimage");
    let (preimage, payment_hash) = HtlcBuilder::generate_preimage();
    println!("  Payment hash: {}", hex::encode(&payment_hash));
    println!("  (Bob keeps preimage secret: {})", hex::encode(&preimage));
    
    // Step 3: Create HTLC parameters
    println!("\nStep 3: Creating HTLC with 144 block timeout (~24 hours)");
    let timeout_blocks = 144; // ~24 hours on Bitcoin
    
    let htlc_params = HtlcParams {
        recipient_pubkey: bob_pubkey.clone(),
        sender_pubkey: alice_pubkey.clone(),
        payment_hash,
        timeout: 500_000 + timeout_blocks, // Current height + timeout
    };
    
    // Step 4: Build HTLC script
    println!("\nStep 4: Building HTLC script");
    let htlc_script = HtlcBuilder::build_htlc_script(&htlc_params).unwrap();
    println!("  HTLC P2SH address: {}", htlc_script.p2sh_address);
    println!("  Redeem script size: {} bytes", htlc_script.redeem_script.len());
    
    // Step 5: Alice funds the HTLC
    println!("\nStep 5: Alice creates funding transaction");
    let builder = TransactionBuilder::new(network);
    
    // Simulate Alice's UTXO
    let alice_utxo = OutPoint {
        txid: "1111111111111111111111111111111111111111111111111111111111111111".parse().unwrap(),
        vout: 0,
    };
    let alice_utxo_value = Amount::from_sat(200_000);
    let htlc_amount = Amount::from_sat(100_000);
    
    let htlc_address = Address::from_str(&htlc_script.p2sh_address)
        .unwrap()
        .require_network(network)
        .unwrap();
    
    let funding_tx = builder.create_funding_tx(
        alice_utxo,
        alice_utxo_value,
        &htlc_address,
        htlc_amount,
        &alice_address,
        10, // 10 sats/vbyte fee rate
    ).unwrap();
    
    println!("  Funding TX created with {} inputs and {} outputs", 
        funding_tx.input.len(), 
        funding_tx.output.len()
    );
    println!("  HTLC output: {} sats to {}", 
        funding_tx.output[0].value.to_sat(),
        htlc_script.p2sh_address
    );
    
    // Step 6: After confirmations, Bob reveals preimage and claims
    println!("\nStep 6: Bob reveals preimage and claims funds");
    
    // Simulate the HTLC UTXO from funding transaction
    let htlc_utxo = OutPoint {
        txid: funding_tx.txid(),
        vout: 0,
    };
    
    let claim_tx = builder.create_claim_tx(
        htlc_utxo,
        htlc_amount,
        &htlc_script.redeem_script,
        &preimage,
        &bob_sk,
        &bob_address,
        Amount::from_sat(5_000), // 5k sats fee
    ).unwrap();
    
    println!("  Claim TX created!");
    println!("  Bob receives: {} sats", claim_tx.output[0].value.to_sat());
    println!("  Claim TX locktime: {}", claim_tx.lock_time);
    
    // Verify claim transaction structure
    assert_eq!(claim_tx.input.len(), 1);
    assert_eq!(claim_tx.output.len(), 1);
    assert_eq!(claim_tx.output[0].script_pubkey, bob_address.script_pubkey());
    
    // Step 7: Alternative - timeout scenario
    println!("\nStep 7: Alternative scenario - timeout refund");
    
    let refund_tx = builder.create_refund_tx(
        htlc_utxo,
        htlc_amount,
        &htlc_script.redeem_script,
        htlc_params.timeout,
        &alice_sk,
        &alice_address,
        Amount::from_sat(5_000),
    ).unwrap();
    
    println!("  Refund TX created with locktime: {}", refund_tx.lock_time);
    println!("  Alice gets back: {} sats", refund_tx.output[0].value.to_sat());
    
    // Verify refund transaction
    assert_eq!(refund_tx.lock_time.to_consensus_u32(), htlc_params.timeout);
    
    println!("\n=== Test completed successfully! ===");
}

#[test]
fn test_htlc_claim_validation() {
    println!("\n=== Testing HTLC claim validation ===");
    
    let secp = Secp256k1::new();
    let builder = TransactionBuilder::new(Network::Testnet);
    
    // Setup keys
    let alice_sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
    let alice_pubkey = PublicKey {
        inner: alice_sk.public_key(&secp),
        compressed: true,
    };
    
    let bob_sk = SecretKey::from_slice(&[2u8; 32]).unwrap();
    let bob_pubkey = PublicKey {
        inner: bob_sk.public_key(&secp),
        compressed: true,
    };
    
    // Generate preimage
    let correct_preimage = [0x42u8; 32];
    let payment_hash = HtlcBuilder::hash_preimage(&correct_preimage);
    let wrong_preimage = [0xFF; 32];
    
    // Create HTLC
    let params = HtlcParams {
        recipient_pubkey: bob_pubkey,
        sender_pubkey: alice_pubkey,
        payment_hash,
        timeout: 500_000,
    };
    
    let htlc_script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Test data
    let htlc_outpoint = OutPoint {
        txid: "2222222222222222222222222222222222222222222222222222222222222222".parse().unwrap(),
        vout: 0,
    };
    let htlc_amount = Amount::from_sat(100_000);
    let claim_address = Address::from_str("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    // Test 1: Correct preimage should work
    println!("\nTest 1: Claiming with correct preimage");
    let _claim_tx = builder.create_claim_tx(
        htlc_outpoint,
        htlc_amount,
        &htlc_script.redeem_script,
        &correct_preimage,
        &bob_sk,
        &claim_address,
        Amount::from_sat(5_000),
    ).unwrap();
    println!("  ✓ Claim transaction created successfully");
    
    // Test 2: Wrong preimage would fail when broadcast (can't test here without actual validation)
    println!("\nTest 2: Creating claim TX with wrong preimage");
    let _wrong_claim_tx = builder.create_claim_tx(
        htlc_outpoint,
        htlc_amount,
        &htlc_script.redeem_script,
        &wrong_preimage,
        &bob_sk,
        &claim_address,
        Amount::from_sat(5_000),
    ).unwrap();
    println!("  ✓ Transaction created (would fail validation when broadcast)");
    
    // Test 3: Wrong key would also fail
    println!("\nTest 3: Creating claim TX with wrong key");
    let _wrong_claim_key_tx = builder.create_claim_tx(
        htlc_outpoint,
        htlc_amount,
        &htlc_script.redeem_script,
        &correct_preimage,
        &alice_sk, // Wrong key!
        &claim_address,
        Amount::from_sat(5_000),
    ).unwrap();
    println!("  ✓ Transaction created (would fail validation when broadcast)");
    
    println!("\n=== Validation test completed ===");
}

#[test]
fn test_htlc_edge_cases() {
    let secp = Secp256k1::new();
    
    // Test with maximum timeout value
    let params = HtlcParams {
        recipient_pubkey: PublicKey {
            inner: SecretKey::from_slice(&[1u8; 32]).unwrap().public_key(&secp),
            compressed: true,
        },
        sender_pubkey: PublicKey {
            inner: SecretKey::from_slice(&[2u8; 32]).unwrap().public_key(&secp),
            compressed: true,
        },
        payment_hash: [0u8; 32],
        timeout: 0xFFFFFF, // Near max value
    };
    
    let script = HtlcBuilder::build_htlc_script(&params).unwrap();
    assert!(!script.redeem_script.is_empty());
    
    // Test with minimum timeout
    let mut min_params = params.clone();
    min_params.timeout = 1;
    let min_script = HtlcBuilder::build_htlc_script(&min_params).unwrap();
    assert!(!min_script.redeem_script.is_empty());
    
    println!("Edge case tests passed!");
}