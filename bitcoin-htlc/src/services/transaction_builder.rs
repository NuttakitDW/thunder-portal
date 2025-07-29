use bitcoin::{
    absolute::LockTime,
    blockdata::script::{Builder, PushBytesBuf},
    key::Secp256k1,
    secp256k1::{Message, SecretKey},
    sighash::{EcdsaSighashType, SighashCache},
    transaction::Version,
    Address, Amount, Network, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Witness,
    hashes::Hash,
};
use crate::models::ApiError;

pub struct TransactionBuilder {
    network: Network,
    secp: Secp256k1<bitcoin::secp256k1::All>,
}

impl TransactionBuilder {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            secp: Secp256k1::new(),
        }
    }

    /// Create a transaction that funds an HTLC
    pub fn create_funding_tx(
        &self,
        utxo: OutPoint,
        utxo_value: Amount,
        htlc_address: &Address,
        htlc_amount: Amount,
        change_address: &Address,
        fee_rate: u64, // sats per vByte
    ) -> Result<Transaction, ApiError> {
        // Create transaction with one input and two outputs (HTLC + change)
        let mut tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: vec![TxIn {
                previous_output: utxo,
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            }],
            output: vec![
                // HTLC output
                TxOut {
                    value: htlc_amount,
                    script_pubkey: htlc_address.script_pubkey(),
                },
            ],
        };

        // Calculate fee (simplified - in production use proper fee calculation)
        let tx_vsize = 250; // Approximate size for 1-in-2-out transaction
        let fee = Amount::from_sat(tx_vsize * fee_rate);

        // Add change output if there's enough left after fee
        let change_amount = utxo_value
            .checked_sub(htlc_amount)
            .and_then(|v| v.checked_sub(fee))
            .ok_or_else(|| ApiError::BadRequest("Insufficient funds for transaction".to_string()))?;

        if change_amount > Amount::from_sat(546) {
            // Dust limit
            tx.output.push(TxOut {
                value: change_amount,
                script_pubkey: change_address.script_pubkey(),
            });
        }

        Ok(tx)
    }

    /// Create a transaction that claims an HTLC with a preimage
    pub fn create_claim_tx(
        &self,
        htlc_outpoint: OutPoint,
        htlc_amount: Amount,
        htlc_redeem_script: &[u8],
        preimage: &[u8; 32],
        claim_key: &SecretKey,
        claim_address: &Address,
        fee: Amount,
    ) -> Result<Transaction, ApiError> {
        let mut tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: vec![TxIn {
                previous_output: htlc_outpoint,
                script_sig: ScriptBuf::new(),
                sequence: Sequence::MAX,
                witness: Witness::new(),
            }],
            output: vec![TxOut {
                value: htlc_amount
                    .checked_sub(fee)
                    .ok_or_else(|| ApiError::BadRequest("Insufficient HTLC value for fee".to_string()))?,
                script_pubkey: claim_address.script_pubkey(),
            }],
        };

        // Create signature
        let sighash = SighashCache::new(&tx).legacy_signature_hash(
            0,
            &ScriptBuf::from(htlc_redeem_script.to_vec()),
            EcdsaSighashType::All.to_u32(),
        ).map_err(|e| ApiError::BitcoinError(format!("Failed to compute sighash: {}", e)))?;

        let message = Message::from_digest(*sighash.as_byte_array())
;

        let sig = self.secp.sign_ecdsa(&message, claim_key);

        // Build scriptSig: <sig> <preimage> <1> <redeem_script>
        let mut script_sig = Builder::new();
        let sig_bytes = PushBytesBuf::try_from(sig.serialize_der().to_vec())
            .map_err(|_| ApiError::BitcoinError("Signature too large".to_string()))?;
        script_sig = script_sig.push_slice(&sig_bytes);
        script_sig = script_sig.push_int(EcdsaSighashType::All as i64);
        let preimage_bytes = PushBytesBuf::try_from(preimage.to_vec())
            .map_err(|_| ApiError::BitcoinError("Preimage too large".to_string()))?;
        script_sig = script_sig.push_slice(&preimage_bytes);
        script_sig = script_sig.push_int(1); // Select IF branch (OP_TRUE)
        let redeem_script_bytes = PushBytesBuf::try_from(htlc_redeem_script.to_vec())
            .map_err(|_| ApiError::BitcoinError("Redeem script too large".to_string()))?;
        script_sig = script_sig.push_slice(&redeem_script_bytes);

        tx.input[0].script_sig = script_sig.into_script();

        Ok(tx)
    }

    /// Create a transaction that refunds an HTLC after timeout
    pub fn create_refund_tx(
        &self,
        htlc_outpoint: OutPoint,
        htlc_amount: Amount,
        htlc_redeem_script: &[u8],
        timeout_height: u32,
        refund_key: &SecretKey,
        refund_address: &Address,
        fee: Amount,
    ) -> Result<Transaction, ApiError> {
        let mut tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::from_height(timeout_height)
                .map_err(|e| ApiError::BitcoinError(format!("Invalid timeout height: {}", e)))?,
            input: vec![TxIn {
                previous_output: htlc_outpoint,
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ZERO, // Required for timelock
                witness: Witness::new(),
            }],
            output: vec![TxOut {
                value: htlc_amount
                    .checked_sub(fee)
                    .ok_or_else(|| ApiError::BadRequest("Insufficient HTLC value for fee".to_string()))?,
                script_pubkey: refund_address.script_pubkey(),
            }],
        };

        // Create signature
        let sighash = SighashCache::new(&tx).legacy_signature_hash(
            0,
            &ScriptBuf::from(htlc_redeem_script.to_vec()),
            EcdsaSighashType::All.to_u32(),
        ).map_err(|e| ApiError::BitcoinError(format!("Failed to compute sighash: {}", e)))?;

        let message = Message::from_digest(*sighash.as_byte_array())
;

        let sig = self.secp.sign_ecdsa(&message, refund_key);

        // Build scriptSig: <sig> <0> <redeem_script>
        let mut script_sig = Builder::new();
        let sig_bytes = PushBytesBuf::try_from(sig.serialize_der().to_vec())
            .map_err(|_| ApiError::BitcoinError("Signature too large".to_string()))?;
        script_sig = script_sig.push_slice(&sig_bytes);
        script_sig = script_sig.push_int(EcdsaSighashType::All as i64);
        script_sig = script_sig.push_int(0); // Select ELSE branch (OP_FALSE)
        let redeem_script_bytes = PushBytesBuf::try_from(htlc_redeem_script.to_vec())
            .map_err(|_| ApiError::BitcoinError("Redeem script too large".to_string()))?;
        script_sig = script_sig.push_slice(&redeem_script_bytes);

        tx.input[0].script_sig = script_sig.into_script();

        Ok(tx)
    }
}