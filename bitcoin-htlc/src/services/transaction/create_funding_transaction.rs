use bitcoin::{
    absolute::LockTime,
    transaction::Version,
    Address, Amount, OutPoint, Sequence, Transaction, TxIn, TxOut,
};
use crate::models::ApiError;

/// Create funding transaction for HTLC
pub fn create_funding_transaction(
    inputs: Vec<(OutPoint, Amount)>,
    htlc_address: &Address,
    htlc_amount: Amount,
    change_address: &Address,
    fee: Amount,
) -> Result<Transaction, ApiError> {
    // Calculate total input amount
    let total_input: Amount = inputs.iter()
        .map(|(_, amount)| *amount)
        .sum::<Amount>();
    
    // Calculate change amount
    let total_output = htlc_amount + fee;
    if total_input < total_output {
        return Err(ApiError::BitcoinError(
            format!("Insufficient funds: {} < {}", total_input, total_output)
        ));
    }
    let change_amount = total_input - total_output;
    
    // Create transaction inputs
    let transaction_inputs: Vec<TxIn> = inputs.into_iter()
        .map(|(outpoint, _)| TxIn {
            previous_output: outpoint,
            script_sig: bitcoin::ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: bitcoin::Witness::new(),
        })
        .collect();
    
    // Create transaction outputs
    let mut transaction_outputs = vec![
        TxOut {
            value: htlc_amount,
            script_pubkey: htlc_address.script_pubkey(),
        }
    ];
    
    // Add change output if there's any change
    if change_amount > Amount::ZERO {
        transaction_outputs.push(TxOut {
            value: change_amount,
            script_pubkey: change_address.script_pubkey(),
        });
    }
    
    Ok(Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: transaction_inputs,
        output: transaction_outputs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::Network;
    use std::str::FromStr;

    #[test]
    fn test_create_funding_transaction_success() {
        let outpoint = OutPoint::default();
        let inputs = vec![(outpoint, Amount::from_sat(200_000))];
        let htlc_address = Address::from_str("2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        let change_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let transaction = create_funding_transaction(
            inputs,
            &htlc_address,
            Amount::from_sat(100_000),
            &change_address,
            Amount::from_sat(10_000),
        ).unwrap();
        
        assert_eq!(transaction.input.len(), 1);
        assert_eq!(transaction.output.len(), 2);
        assert_eq!(transaction.output[0].value, Amount::from_sat(100_000));
        assert_eq!(transaction.output[1].value, Amount::from_sat(90_000));
    }

    #[test]
    fn test_create_funding_transaction_insufficient_funds() {
        let outpoint = OutPoint::default();
        let inputs = vec![(outpoint, Amount::from_sat(50_000))];
        let htlc_address = Address::from_str("2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        let change_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let result = create_funding_transaction(
            inputs,
            &htlc_address,
            Amount::from_sat(100_000),
            &change_address,
            Amount::from_sat(10_000),
        );
        
        assert!(result.is_err());
    }

    #[test]
    fn test_create_funding_transaction_no_change() {
        let outpoint = OutPoint::default();
        let inputs = vec![(outpoint, Amount::from_sat(110_000))];
        let htlc_address = Address::from_str("2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        let change_address = Address::from_str("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")
            .unwrap()
            .require_network(Network::Testnet)
            .unwrap();
        
        let transaction = create_funding_transaction(
            inputs,
            &htlc_address,
            Amount::from_sat(100_000),
            &change_address,
            Amount::from_sat(10_000),
        ).unwrap();
        
        assert_eq!(transaction.output.len(), 1); // No change output
    }
}