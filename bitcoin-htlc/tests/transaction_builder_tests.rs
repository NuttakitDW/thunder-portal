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

#[test]
fn test_create_funding_transaction() {
    let builder = TransactionBuilder::new(Network::Testnet);
    
    // Create dummy UTXO
    let utxo = OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000000".parse().unwrap(),
        vout: 0,
    };
    let utxo_value = Amount::from_sat(200_000);
    
    // Create HTLC address
    let htlc_address = Address::from_str("2Msz3xKmDbzSrhKGwPv3EcpB2qJN4oN5EZq")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    let htlc_amount = Amount::from_sat(100_000);
    
    // Create change address
    let change_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    let fee_rate = 10; // sats/vbyte
    
    // Create funding transaction
    let tx = builder.create_funding_tx(
        utxo,
        utxo_value,
        &htlc_address,
        htlc_amount,
        &change_address,
        fee_rate
    ).unwrap();
    
    // Verify transaction structure
    assert_eq!(tx.input.len(), 1);
    assert_eq!(tx.output.len(), 2); // HTLC output + change
    assert_eq!(tx.output[0].value, htlc_amount);
    assert_eq!(tx.output[0].script_pubkey, htlc_address.script_pubkey());
}

#[test]
fn test_create_claim_transaction() {
    let secp = Secp256k1::new();
    let builder = TransactionBuilder::new(Network::Testnet);
    
    // Generate keys
    let recipient_sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
    let recipient_pubkey = PublicKey {
        inner: recipient_sk.public_key(&secp),
        compressed: true,
    };
    
    let sender_sk = SecretKey::from_slice(&[2u8; 32]).unwrap();
    let sender_pubkey = PublicKey {
        inner: sender_sk.public_key(&secp),
        compressed: true,
    };
    
    // Generate preimage and hash
    let preimage = [0x42u8; 32];
    let payment_hash = HtlcBuilder::hash_preimage(&preimage);
    
    // Create HTLC
    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: 500_000,
    };
    
    let htlc_script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Create claim transaction inputs
    let htlc_outpoint = OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000001".parse().unwrap(),
        vout: 0,
    };
    let htlc_amount = Amount::from_sat(100_000);
    
    let claim_address = Address::from_str("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    let fee = Amount::from_sat(5_000);
    
    // Create claim transaction
    let tx = builder.create_claim_tx(
        htlc_outpoint,
        htlc_amount,
        &htlc_script.redeem_script,
        &preimage,
        &recipient_sk,
        &claim_address,
        fee
    ).unwrap();
    
    // Verify transaction structure
    assert_eq!(tx.input.len(), 1);
    assert_eq!(tx.output.len(), 1);
    assert_eq!(tx.output[0].value, htlc_amount - fee);
    assert_eq!(tx.output[0].script_pubkey, claim_address.script_pubkey());
}

#[test]
fn test_create_refund_transaction() {
    let secp = Secp256k1::new();
    let builder = TransactionBuilder::new(Network::Testnet);
    
    // Generate keys
    let sender_sk = SecretKey::from_slice(&[2u8; 32]).unwrap();
    let sender_pubkey = PublicKey {
        inner: sender_sk.public_key(&secp),
        compressed: true,
    };
    
    let recipient_sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
    let recipient_pubkey = PublicKey {
        inner: recipient_sk.public_key(&secp),
        compressed: true,
    };
    
    // Generate payment hash
    let payment_hash = [0x42u8; 32];
    
    // Create HTLC
    let timeout_height = 500_000;
    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: timeout_height,
    };
    
    let htlc_script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // Create refund transaction inputs
    let htlc_outpoint = OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000002".parse().unwrap(),
        vout: 0,
    };
    let htlc_amount = Amount::from_sat(100_000);
    
    let refund_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    let fee = Amount::from_sat(5_000);
    
    // Create refund transaction
    let tx = builder.create_refund_tx(
        htlc_outpoint,
        htlc_amount,
        &htlc_script.redeem_script,
        timeout_height,
        &sender_sk,
        &refund_address,
        fee
    ).unwrap();
    
    // Verify transaction structure
    assert_eq!(tx.input.len(), 1);
    assert_eq!(tx.output.len(), 1);
    assert_eq!(tx.output[0].value, htlc_amount - fee);
    assert_eq!(tx.output[0].script_pubkey, refund_address.script_pubkey());
    
    // Verify locktime is set for refund
    assert_eq!(tx.lock_time.to_consensus_u32(), timeout_height);
}

#[test]
fn test_insufficient_funds_for_fee() {
    let _secp = Secp256k1::new();
    let builder = TransactionBuilder::new(Network::Testnet);
    
    // Generate minimal keys
    let sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
    
    // Create transaction with fee larger than input
    let htlc_outpoint = OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000003".parse().unwrap(),
        vout: 0,
    };
    let htlc_amount = Amount::from_sat(1_000);
    let fee = Amount::from_sat(2_000); // Fee exceeds amount
    
    let address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
        .unwrap()
        .require_network(Network::Testnet)
        .unwrap();
    
    // Should fail due to insufficient funds
    let result = builder.create_claim_tx(
        htlc_outpoint,
        htlc_amount,
        &[0u8; 100], // dummy script
        &[0u8; 32],  // dummy preimage
        &sk,
        &address,
        fee
    );
    
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Insufficient HTLC value"));
}

#[test]
fn test_htlc_script_size() {
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
    
    let payment_hash = [0x42u8; 32];
    
    let params = HtlcParams {
        recipient_pubkey,
        sender_pubkey,
        payment_hash,
        timeout: 500_000,
    };
    
    let script = HtlcBuilder::build_htlc_script(&params).unwrap();
    
    // HTLC script should be reasonable size
    assert!(script.redeem_script.len() > 50); // Has some content
    assert!(script.redeem_script.len() < 520); // Within standard script size limit
    
    println!("HTLC redeem script size: {} bytes", script.redeem_script.len());
}