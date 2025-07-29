use bitcoin::{
    absolute::LockTime,
    key::Secp256k1,
    secp256k1::{Message, SecretKey},
    sighash::{EcdsaSighashType, SighashCache},
    transaction::Version,
    Address, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Witness,
    hashes::Hash,
};
use crate::models::ApiError;

/// Create claim transaction for HTLC
pub fn create_claim_transaction(
    htlc_outpoint: OutPoint,
    htlc_amount: Amount,
    redeem_script: &[u8],
    preimage: &[u8],
    claim_key: &SecretKey,
    claim_address: &Address,
    fee: Amount,
) -> Result<Transaction, ApiError> {
    if htlc_amount <= fee {
        return Err(ApiError::InternalError {
            code: "BITCOIN_TRANSACTION_ERROR".to_string(),
            message: "HTLC amount must be greater than fee".to_string(),
            details: None,
        });
    }
    
    let claim_amount = htlc_amount - fee;
    
    // Create the claim transaction
    let mut transaction = Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: vec![TxIn {
            previous_output: htlc_outpoint,
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(),
        }],
        output: vec![TxOut {
            value: claim_amount,
            script_pubkey: claim_address.script_pubkey(),
        }],
    };
    
    // Sign the transaction
    let secp = Secp256k1::new();
    let mut sighash_cache = SighashCache::new(&transaction);
    let sighash = sighash_cache
        .p2wsh_signature_hash(
            0,
            &ScriptBuf::from(redeem_script.to_vec()),
            htlc_amount,
            EcdsaSighashType::All,
        )
        .map_err(|e| ApiError::InternalError {
            code: "BITCOIN_TRANSACTION_ERROR".to_string(),
            message: format!("Failed to compute sighash: {}", e),
            details: None,
        })?;
    
    let message = Message::from_digest(sighash.to_byte_array());
    let signature = secp.sign_ecdsa(&message, claim_key);
    
    // Build witness script
    let mut witness = Witness::new();
    witness.push(signature.serialize_der());
    witness.push([EcdsaSighashType::All as u8]);
    witness.push(preimage);
    witness.push([1u8]); // OP_TRUE for IF branch
    witness.push(redeem_script);
    
    transaction.input[0].witness = witness;
    
    Ok(transaction)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::Network;
    use std::str::FromStr;

    #[test]
    fn test_create_claim_transaction_success() {
        let _secp = Secp256k1::new();
        let claim_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let claim_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let htlc_outpoint = OutPoint::default();
        let redeem_script = vec![0u8; 100]; // Mock script
        let preimage = [2u8; 32];
        
        let transaction = create_claim_transaction(
            htlc_outpoint,
            Amount::from_sat(100_000),
            &redeem_script,
            &preimage,
            &claim_key,
            &claim_address,
            Amount::from_sat(5_000),
        ).unwrap();
        
        assert_eq!(transaction.input.len(), 1);
        assert_eq!(transaction.output.len(), 1);
        assert_eq!(transaction.output[0].value, Amount::from_sat(95_000));
        assert!(!transaction.input[0].witness.is_empty());
    }

    #[test]
    fn test_create_claim_transaction_insufficient_amount() {
        let claim_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let claim_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let result = create_claim_transaction(
            OutPoint::default(),
            Amount::from_sat(1_000),
            &[],
            &[],
            &claim_key,
            &claim_address,
            Amount::from_sat(5_000),
        );
        
        assert!(result.is_err());
    }
}