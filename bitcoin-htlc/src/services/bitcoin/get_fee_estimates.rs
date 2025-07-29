use crate::models::ApiError;
use serde::Serialize;

/// Get fee estimates for Bitcoin transactions
pub async fn get_fee_estimates() -> Result<FeeEstimates, ApiError> {
    // For Blockstream API, we'll use a fixed fee rate for testnet
    // In production, you'd want to use a proper fee estimation service
    Ok(FeeEstimates {
        fastest: 5,
        half_hour: 3,
        hour: 2,
        economy: 1,
    })
}

#[derive(Debug, Serialize)]
pub struct FeeEstimates {
    pub fastest: u32,
    pub half_hour: u32,
    pub hour: u32,
    pub economy: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_fee_estimates_returns_valid_rates() {
        let estimates = get_fee_estimates().await.unwrap();
        
        assert!(estimates.fastest > estimates.half_hour);
        assert!(estimates.half_hour > estimates.hour);
        assert!(estimates.hour >= estimates.economy);
    }

    #[test]
    fn test_fee_estimates_reasonable_values() {
        let estimates = FeeEstimates {
            fastest: 5,
            half_hour: 3,
            hour: 2,
            economy: 1,
        };

        // Testnet fees should be low
        assert!(estimates.fastest <= 10);
        assert!(estimates.economy >= 1);
    }
}