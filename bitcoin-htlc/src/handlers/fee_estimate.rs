use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct FeeEstimateQuery {
    pub direction: SwapDirection,
    pub amount: String,
    #[serde(rename = "fromToken")]
    pub from_token: Option<String>,
    #[serde(rename = "toToken")]
    pub to_token: Option<String>,
    pub urgent: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeeEstimate {
    pub direction: SwapDirection,
    pub amount: String,
    pub bitcoin_network_fee: BitcoinNetworkFee,
    pub ethereum_gas_fee: EthereumGasFee,
    pub resolver_fee: ResolverFee,
    pub total_fee: TotalFee,
    pub estimated_time: EstimatedTime,
    pub warnings: Vec<String>,
    pub minimum_amount: String,
    pub maximum_amount: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BitcoinNetworkFee {
    pub satoshis: String,
    pub satoshis_per_vbyte: u32,
    pub estimated_vsize: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumGasFee {
    pub wei: String,
    pub gas_price: String,
    pub gas_limit: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolverFee {
    pub amount: String,
    pub percentage: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TotalFee {
    pub input_currency: String,
    pub output_currency: String,
    pub percentage: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimatedTime {
    pub bitcoin_confirmations: u32,
    pub ethereum_confirmations: u32,
    pub total_minutes: u32,
}

/// Estimate swap fees
pub async fn estimate_fees(
    state: web::Data<AppState>,
    query: web::Query<FeeEstimateQuery>,
) -> Result<HttpResponse, ApiError> {
    // Validate amount
    let amount: u64 = query.amount.parse().map_err(|_| ApiError::BadRequest {
        code: "INVALID_AMOUNT".to_string(),
        message: "Invalid amount format".to_string(),
        details: None,
    })?;

    // Get current fee rates
    let bitcoin_client = state.order_service.bitcoin_client();
    let fee_estimates = bitcoin_client.get_fee_estimates().await?;
    
    let urgent = query.urgent.unwrap_or(false);
    let sats_per_vbyte = if urgent {
        fee_estimates.fastest
    } else {
        fee_estimates.half_hour
    };

    // Calculate fees based on direction
    let (bitcoin_fee, ethereum_fee, warnings) = match query.direction {
        SwapDirection::EthToBtc => {
            // HTLC creation + claim transactions
            let estimated_vsize = 250; // Approximate HTLC vsize
            let bitcoin_fee = BitcoinNetworkFee {
                satoshis: (sats_per_vbyte * estimated_vsize).to_string(),
                satoshis_per_vbyte: sats_per_vbyte,
                estimated_vsize,
            };
            
            // Ethereum gas for Fusion+ order
            let ethereum_fee = EthereumGasFee {
                wei: "3000000000000000".to_string(), // 0.003 ETH
                gas_price: "20000000000".to_string(), // 20 gwei
                gas_limit: 150000,
            };
            
            let mut warnings = vec![];
            if amount < 100000 {
                warnings.push("Amount too small - fees exceed 5% of swap value".to_string());
            }
            
            (bitcoin_fee, ethereum_fee, warnings)
        }
        SwapDirection::BtcToEth => {
            // User creates HTLC
            let estimated_vsize = 300;
            let bitcoin_fee = BitcoinNetworkFee {
                satoshis: (sats_per_vbyte * estimated_vsize).to_string(),
                satoshis_per_vbyte: sats_per_vbyte,
                estimated_vsize,
            };
            
            // Ethereum gas for Fusion+ fill
            let ethereum_fee = EthereumGasFee {
                wei: "2000000000000000".to_string(), // 0.002 ETH
                gas_price: "20000000000".to_string(), // 20 gwei
                gas_limit: 100000,
            };
            
            let warnings = vec![];
            (bitcoin_fee, ethereum_fee, warnings)
        }
    };

    // Resolver fee (0.5%)
    let resolver_fee_amount = (amount as f64 * 0.005) as u64;
    let resolver_fee = ResolverFee {
        amount: resolver_fee_amount.to_string(),
        percentage: 0.5,
    };

    // Total fees
    let total_fee_percentage = 1.2; // Example total
    let total_fee = TotalFee {
        input_currency: match query.direction {
            SwapDirection::EthToBtc => ethereum_fee.wei.clone(),
            SwapDirection::BtcToEth => bitcoin_fee.satoshis.clone(),
        },
        output_currency: resolver_fee_amount.to_string(),
        percentage: total_fee_percentage,
    };

    // Time estimates
    let estimated_time = EstimatedTime {
        bitcoin_confirmations: 3,
        ethereum_confirmations: 12,
        total_minutes: 45, // ~30 min for BTC + 15 min for ETH
    };

    let response = FeeEstimate {
        direction: query.direction.clone(),
        amount: query.amount.clone(),
        bitcoin_network_fee: bitcoin_fee,
        ethereum_gas_fee: ethereum_fee,
        resolver_fee,
        total_fee,
        estimated_time,
        warnings,
        minimum_amount: "50000".to_string(), // 0.0005 BTC
        maximum_amount: "10000000000".to_string(), // 100 BTC
    };

    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fee_calculation() {
        let amount: u64 = 1000000; // 0.01 BTC
        let resolver_fee = (amount as f64 * 0.005) as u64;
        assert_eq!(resolver_fee, 5000); // 0.5% of 0.01 BTC
    }
}