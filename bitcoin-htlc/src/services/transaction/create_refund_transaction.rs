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

/// Create refund transaction for HTLC after timeout
pub fn create_refund_transaction(
    htlc_outpoint: OutPoint,
    htlc_amount: Amount,
    redeem_script: &[u8],
    refund_key: &SecretKey,
    refund_address: &Address,
    timeout: u32,
    fee: Amount,
) -> Result<Transaction, ApiError> {
    if htlc_amount <= fee {
        return Err(ApiError::InternalError {
            code: "BITCOIN_TRANSACTION_ERROR".to_string(),
            message: "HTLC amount must be greater than fee".to_string(),
            details: None,
        });
    }
    
    let refund_amount = htlc_amount - fee;
    
    // Create the refund transaction with locktime
    let mut transaction = Transaction {
        version: Version::TWO,
        lock_time: LockTime::from_height(timeout)
            .map_err(|e| ApiError::InternalError {
                code: "BITCOIN_TRANSACTION_ERROR".to_string(),
                message: format!("Invalid timeout height: {}", e),
                details: None,
            })?,
        input: vec![TxIn {
            previous_output: htlc_outpoint,
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_LOCKTIME_NO_RBF,
            witness: Witness::new(),
        }],
        output: vec![TxOut {
            value: refund_amount,
            script_pubkey: refund_address.script_pubkey(),
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
    let signature = secp.sign_ecdsa(&message, refund_key);
    
    // Build witness script for refund (ELSE branch)
    let mut witness = Witness::new();
    witness.push(signature.serialize_der());
    witness.push([EcdsaSighashType::All as u8]);
    witness.push([]); // OP_FALSE for ELSE branch
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
    fn test_create_refund_transaction_success() {
        let refund_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let refund_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let htlc_outpoint = OutPoint::default();
        let redeem_script = vec![0u8; 100]; // Mock script
        let timeout = 500_000;
        
        let transaction = create_refund_transaction(
            htlc_outpoint,
            Amount::from_sat(100_000),
            &redeem_script,
            &refund_key,
            &refund_address,
            timeout,
            Amount::from_sat(5_000),
        ).unwrap();
        
        assert_eq!(transaction.input.len(), 1);
        assert_eq!(transaction.output.len(), 1);
        assert_eq!(transaction.output[0].value, Amount::from_sat(95_000));
        assert!(!transaction.input[0].witness.is_empty());
        assert_eq!(transaction.lock_time.to_consensus_u32(), timeout);
    }

    #[test]
    fn test_create_refund_transaction_sequence_for_locktime() {
        let refund_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let refund_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let transaction = create_refund_transaction(
            OutPoint::default(),
            Amount::from_sat(100_000),
            &[],
            &refund_key,
            &refund_address,
            500_000,
            Amount::from_sat(5_000),
        ).unwrap();
        
        // Sequence should enable locktime
        assert_eq!(transaction.input[0].sequence, Sequence::ENABLE_LOCKTIME_NO_RBF);
    }

    #[test]
    fn test_create_refund_transaction_insufficient_amount() {
        let refund_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let refund_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let result = create_refund_transaction(
            OutPoint::default(),
            Amount::from_sat(1_000),
            &[],
            &refund_key,
            &refund_address,
            500_000,
            Amount::from_sat(5_000),
        );
        
        assert!(result.is_err());
    }
}