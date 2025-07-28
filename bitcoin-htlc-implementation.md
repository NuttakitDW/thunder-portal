# Bitcoin HTLC Implementation for Thunder Portal

## Overview

Implementation plan for Thunder Portal's Bitcoin HTLC service based on the corrected cross-chain swap API specification. This service enables trustless ETH ↔ BTC atomic swaps via 1inch Fusion+.

## Key Design Principles

1. **Both chains use HTLCs** - No regular addresses, atomic guarantees on both sides
2. **Proper order of operations** - Fusion+ proof before Bitcoin HTLC creation
3. **Timeout hierarchy** - Bitcoin timeout > 2x Ethereum timeout
4. **HTLC verification** - Validate user-created HTLCs before proceeding
5. **Refund mechanism** - Clean failure recovery paths

## Architecture

```
thunder-portal/
├── bitcoin-htlc/                 # Rust service
│   ├── src/
│   │   ├── main.rs              # Actix-web server
│   │   ├── api/
│   │   │   ├── orders.rs        # POST /orders, GET /orders/:id
│   │   │   ├── fusion.rs        # POST /orders/:id/fusion-proof
│   │   │   ├── htlc_verify.rs  # POST /htlc/verify
│   │   │   ├── htlc_claim.rs   # POST /htlc/:id/claim
│   │   │   ├── htlc_refund.rs  # POST /htlc/:id/refund
│   │   │   ├── status.rs        # GET /transactions/:id/status
│   │   │   ├── health.rs        # GET /health
│   │   │   └── fees.rs          # GET /fees/estimate
│   │   ├── models/              # Types from OpenAPI spec
│   │   │   ├── order.rs         # Order request/response types
│   │   │   ├── htlc.rs          # HTLC verification types
│   │   │   └── webhook.rs       # Webhook types
│   │   ├── bitcoin/
│   │   │   ├── htlc_builder.rs  # P2SH HTLC script construction
│   │   │   ├── htlc_verifier.rs # Verify external HTLCs
│   │   │   ├── transaction.rs   # Transaction building
│   │   │   └── monitor.rs       # Network monitoring
│   │   ├── fusion/
│   │   │   ├── client.rs        # Fusion+ resolver client
│   │   │   └── verifier.rs      # Verify Fusion+ orders
│   │   └── db/
│   │       └── models.rs        # Database schemas
│   ├── Cargo.toml
│   └── config/
│       └── default.toml         # Configuration
└── openapi-spec.yaml            # API specification
```

## Core Implementation

### 1. Models (Strict OpenAPI Compliance)

```rust
// models/order.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SwapDirection {
    EthToBtc,
    BtcToEth,
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub direction: SwapDirection,
    pub amount: String,
    pub preimage_hash: String,
    
    // ETH_TO_BTC fields
    pub from_token: Option<TokenInfo>,
    pub bitcoin_address: Option<String>,
    pub bitcoin_public_key: Option<String>,
    
    // BTC_TO_ETH fields
    pub to_token: Option<TokenInfo>,
    pub ethereum_address: Option<String>,
    
    // Resolver configuration
    pub resolver_public_key: Option<String>,
    
    // Confirmation and timeout settings
    pub confirmation_requirements: Option<ConfirmationRequirements>,
    pub timeouts: Option<TimeoutConfig>,
}

#[derive(Deserialize, Serialize)]
pub struct ConfirmationRequirements {
    #[serde(default = "default_bitcoin_confirmations")]
    pub bitcoin: u32,
    #[serde(default = "default_ethereum_confirmations")]
    pub ethereum: u32,
}

fn default_bitcoin_confirmations() -> u32 { 3 }
fn default_ethereum_confirmations() -> u32 { 12 }

#[derive(Deserialize, Serialize)]
pub struct TimeoutConfig {
    #[serde(default = "default_ethereum_blocks")]
    pub ethereum_blocks: u32,
    #[serde(default = "default_bitcoin_blocks")]
    pub bitcoin_blocks: u32,
}

fn default_ethereum_blocks() -> u32 { 300 }  // ~1 hour
fn default_bitcoin_blocks() -> u32 { 144 }   // ~24 hours

// Validate timeout hierarchy
impl TimeoutConfig {
    pub fn validate(&self) -> Result<(), String> {
        // Bitcoin timeout must be at least 2x Ethereum timeout
        let min_bitcoin_timeout = self.ethereum_blocks * 2;
        if self.bitcoin_blocks < min_bitcoin_timeout {
            return Err(format!(
                "Bitcoin timeout ({}) must be at least 2x Ethereum timeout ({})",
                self.bitcoin_blocks, min_bitcoin_timeout
            ));
        }
        Ok(())
    }
}
```

### 2. Order Creation with Proper Flow

```rust
// api/orders.rs
use actix_web::{web, HttpResponse, Result};
use crate::models::*;

pub async fn create_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    // Validate timeout hierarchy
    if let Some(timeouts) = &req.timeouts {
        timeouts.validate()
            .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    }
    
    match req.direction {
        SwapDirection::EthToBtc => create_eth_to_btc_order(app, req).await,
        SwapDirection::BtcToEth => create_btc_to_eth_order(app, req).await,
    }
}

async fn create_eth_to_btc_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    // Validate required fields
    let from_token = req.from_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("from_token required"))?;
    let bitcoin_pubkey = req.bitcoin_public_key.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("bitcoin_public_key required"))?;
    
    // Parse Bitcoin public key
    let user_pubkey = PublicKey::from_str(bitcoin_pubkey)
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    
    // Get resolver public key
    let resolver_pubkey = if let Some(key) = &req.resolver_public_key {
        PublicKey::from_str(key)?
    } else {
        app.default_resolver_pubkey.clone()
    };
    
    // Create order but DON'T create HTLC yet
    let order_id = Uuid::new_v4();
    let order = Order {
        id: order_id,
        direction: SwapDirection::EthToBtc,
        status: OrderStatus::AwaitingFusionProof, // Wait for Fusion+ first!
        from_amount: req.amount.clone(),
        to_amount: calculate_btc_amount(&req.amount, from_token)?,
        preimage_hash: req.preimage_hash.clone(),
        user_bitcoin_pubkey: Some(bitcoin_pubkey.clone()),
        resolver_bitcoin_pubkey: Some(resolver_pubkey.to_string()),
        timeouts: req.timeouts.clone().unwrap_or_default(),
        created_at: Utc::now(),
        expires_at: Utc::now() + Duration::hours(4),
    };
    
    app.db.create_order(&order).await?;
    
    // Tell user to create Fusion+ order first
    Ok(HttpResponse::Created().json(CreateOrderResponse {
        order_id,
        direction: SwapDirection::EthToBtc,
        status: OrderStatus::AwaitingFusionProof,
        expected_steps: vec![
            "Create Fusion+ order on Ethereum with the provided requirements".to_string(),
            format!("Submit Fusion+ proof to /orders/{}/fusion-proof", order_id),
            "Thunder Portal will create and fund Bitcoin HTLC after verification".to_string(),
        ],
        eth_to_btc_instructions: Some(EthToBtcInstructions {
            fusion_order_requirements: FusionOrderRequirements {
                resolver_address: app.ethereum_resolver_address.clone(),
                preimage_hash: req.preimage_hash.clone(),
                token_amount: req.amount.clone(),
                deadline: (Utc::now() + Duration::hours(2)).to_rfc3339(),
            },
        }),
        btc_to_eth_instructions: None,
        expires_at: order.expires_at,
    }))
}

async fn create_btc_to_eth_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    // For BTC->ETH: User creates HTLC first
    let to_token = req.to_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("to_token required"))?;
    let ethereum_address = req.ethereum_address.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("ethereum_address required"))?;
    
    // Generate requirements for user's HTLC
    let user_pubkey = generate_pubkey_for_user(); // User should provide their own
    let resolver_pubkey = app.default_resolver_pubkey.clone();
    let payment_hash = sha256::Hash::from_hex(&req.preimage_hash)?;
    
    let current_height = app.bitcoin_rpc.get_block_count().await?;
    let timeout_height = current_height + req.timeouts.as_ref()
        .map(|t| t.bitcoin_blocks)
        .unwrap_or(144);
    
    // Create order
    let order_id = Uuid::new_v4();
    let order = Order {
        id: order_id,
        direction: SwapDirection::BtcToEth,
        status: OrderStatus::AwaitingBitcoinHtlc,
        from_amount: req.amount.clone(),
        to_amount: calculate_eth_amount(&req.amount, to_token)?,
        ethereum_address: Some(ethereum_address.clone()),
        preimage_hash: req.preimage_hash.clone(),
        created_at: Utc::now(),
        expires_at: Utc::now() + Duration::hours(4),
    };
    
    app.db.create_order(&order).await?;
    
    // Provide HTLC script template for user
    let htlc_template = format!(
        "OP_IF\n  OP_SHA256 {} OP_EQUALVERIFY\n  {} OP_CHECKSIG\nOP_ELSE\n  {} OP_CHECKLOCKTIMEVERIFY OP_DROP\n  {} OP_CHECKSIG\nOP_ENDIF",
        payment_hash,
        user_pubkey,
        timeout_height,
        resolver_pubkey
    );
    
    Ok(HttpResponse::Created().json(CreateOrderResponse {
        order_id,
        direction: SwapDirection::BtcToEth,
        status: OrderStatus::AwaitingBitcoinHtlc,
        expected_steps: vec![
            "Create Bitcoin HTLC with the provided requirements".to_string(),
            "Fund the HTLC with the specified amount".to_string(),
            format!("Submit HTLC details to /htlc/verify"),
            "After verification, submit Fusion+ order proof".to_string(),
        ],
        eth_to_btc_instructions: None,
        btc_to_eth_instructions: Some(BtcToEthInstructions {
            htlc_requirements: HtlcRequirements {
                user_public_key: user_pubkey.to_string(),
                resolver_public_key: resolver_pubkey.to_string(),
                payment_hash: payment_hash.to_string(),
                amount: req.amount.clone(),
                timeout_height,
                script_template: htlc_template,
            },
        }),
        expires_at: order.expires_at,
    }))
}
```

### 3. Fusion+ Proof Handler

```rust
// api/fusion.rs

pub async fn submit_fusion_proof(
    app: web::Data<AppState>,
    order_id: web::Path<Uuid>,
    req: web::Json<FusionProofRequest>,
) -> Result<HttpResponse> {
    let mut order = app.db.get_order(&order_id).await?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Order not found"))?;
    
    // Verify Fusion+ order data
    verify_fusion_order(&req, &order)?;
    
    // Update order with Fusion+ details
    order.fusion_order_id = Some(req.fusion_order_id.clone());
    order.fusion_order_hash = Some(req.fusion_order_hash.clone());
    
    match order.direction {
        SwapDirection::EthToBtc => {
            // NOW we can create the Bitcoin HTLC
            if order.status != OrderStatus::AwaitingFusionProof {
                return Err(actix_web::error::ErrorBadRequest("Invalid order status"));
            }
            
            // Create Bitcoin HTLC
            let htlc = create_bitcoin_htlc_for_order(&app, &order).await?;
            
            order.bitcoin_htlc_id = Some(htlc.id);
            order.status = OrderStatus::BitcoinHtlcCreated;
            app.db.update_order(&order).await?;
            
            // Fund the HTLC
            let funding_tx = app.bitcoin_wallet
                .fund_htlc(&htlc.address, htlc.amount)
                .await?;
                
            Ok(HttpResponse::Ok().json(FusionProofResponse {
                accepted: true,
                next_step: "Bitcoin HTLC created and being funded".to_string(),
                bitcoin_htlc: Some(BitcoinHtlcDetails {
                    htlc_id: htlc.id,
                    address: htlc.address.to_string(),
                    redeem_script: htlc.script.to_hex(),
                    amount: htlc.amount.to_string(),
                    timeout_height: htlc.timeout_height,
                }),
            }))
        }
        SwapDirection::BtcToEth => {
            // For BTC->ETH, we now know which Fusion+ order to fill
            if order.status != OrderStatus::BitcoinHtlcConfirmed {
                return Err(actix_web::error::ErrorBadRequest(
                    "Bitcoin HTLC must be confirmed first"
                ));
            }
            
            order.status = OrderStatus::FusionOrderFilling;
            app.db.update_order(&order).await?;
            
            Ok(HttpResponse::Ok().json(FusionProofResponse {
                accepted: true,
                next_step: "Will fill Fusion+ order after final verifications".to_string(),
                bitcoin_htlc: None,
            }))
        }
    }
}

async fn create_bitcoin_htlc_for_order(
    app: &web::Data<AppState>,
    order: &Order,
) -> Result<HtlcRecord, Error> {
    let user_pubkey = PublicKey::from_str(&order.user_bitcoin_pubkey.as_ref().unwrap())?;
    let resolver_pubkey = PublicKey::from_str(&order.resolver_bitcoin_pubkey.as_ref().unwrap())?;
    let payment_hash = sha256::Hash::from_hex(&order.preimage_hash)?;
    
    let current_height = app.bitcoin_rpc.get_block_count().await?;
    let timeout_height = current_height + order.timeouts.bitcoin_blocks;
    
    let htlc_params = HtlcParams {
        user_pubkey,
        resolver_pubkey,
        payment_hash,
        timeout: timeout_height,
    };
    
    let script = htlc_params.build_script();
    let address = htlc_params.to_p2sh_address(app.network);
    
    let htlc = HtlcRecord {
        id: Uuid::new_v4(),
        order_id: order.id,
        address: address.to_string(),
        script: script.to_hex(),
        amount: parse_btc_amount(&order.to_amount)?,
        timeout_height,
        status: HtlcStatus::Created,
        created_at: Utc::now(),
    };
    
    app.db.create_htlc(&htlc).await?;
    Ok(htlc)
}
```

### 4. HTLC Verification (Critical for BTC→ETH)

```rust
// api/htlc_verify.rs

pub async fn verify_htlc(
    app: web::Data<AppState>,
    req: web::Json<VerifyHtlcRequest>,
) -> Result<HttpResponse> {
    let order = app.db.get_order(&req.order_id).await?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Order not found"))?;
    
    if order.direction != SwapDirection::BtcToEth {
        return Err(actix_web::error::ErrorBadRequest("Only for BTC to ETH orders"));
    }
    
    if order.status != OrderStatus::AwaitingBitcoinHtlc {
        return Err(actix_web::error::ErrorBadRequest("Invalid order status"));
    }
    
    // Parse and verify the HTLC script
    let script = Script::from_hex(&req.redeem_script)
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    
    let verifier = HtlcVerifier::new(&order);
    let verification_result = verifier.verify_script(&script)?;
    
    if verification_result.valid {
        // Script is valid! Create HTLC record
        let htlc = HtlcRecord {
            id: Uuid::new_v4(),
            order_id: order.id,
            address: req.htlc_address.clone(),
            script: req.redeem_script.clone(),
            amount: parse_btc_amount(&order.from_amount)?,
            timeout_height: verification_result.timeout_height.unwrap(),
            status: HtlcStatus::External, // User-created HTLC
            created_at: Utc::now(),
        };
        
        app.db.create_htlc(&htlc).await?;
        
        // Update order status
        app.db.update_order_status(&order.id, OrderStatus::BitcoinHtlcVerified).await?;
        
        // Start monitoring for funding
        if let Some(funding_txid) = &req.funding_tx_id {
            app.bitcoin_monitor.track_transaction(funding_txid, htlc.id).await?;
        }
        
        Ok(HttpResponse::Ok().json(VerifyHtlcResponse {
            valid: true,
            checks: verification_result.checks,
            errors: vec![],
            htlc_id: Some(htlc.id),
        }))
    } else {
        Ok(HttpResponse::Ok().json(VerifyHtlcResponse {
            valid: false,
            checks: verification_result.checks,
            errors: verification_result.errors,
            htlc_id: None,
        }))
    }
}

// bitcoin/htlc_verifier.rs
pub struct HtlcVerifier {
    expected_payment_hash: sha256::Hash,
    expected_user_pubkey: PublicKey,
    expected_resolver_pubkey: PublicKey,
    min_timeout: u32,
}

impl HtlcVerifier {
    pub fn verify_script(&self, script: &Script) -> Result<VerificationResult> {
        let mut checks = VerificationChecks::default();
        let mut errors = vec![];
        
        // Parse script structure
        let instructions: Vec<_> = script.instructions().collect();
        
        // Check IF/ELSE structure
        checks.script_structure = self.verify_structure(&instructions)?;
        if !checks.script_structure {
            errors.push("Invalid HTLC script structure".to_string());
        }
        
        // Extract and verify payment hash
        if let Some(hash) = self.extract_payment_hash(&instructions) {
            checks.payment_hash = hash == self.expected_payment_hash;
            if !checks.payment_hash {
                errors.push("Payment hash mismatch".to_string());
            }
        }
        
        // Extract and verify public keys
        let (user_key, resolver_key) = self.extract_pubkeys(&instructions)?;
        checks.user_public_key = user_key == self.expected_user_pubkey;
        checks.resolver_public_key = resolver_key == self.expected_resolver_pubkey;
        
        // Extract and verify timeout
        if let Some(timeout) = self.extract_timeout(&instructions) {
            checks.timeout_value = timeout >= self.min_timeout;
            if !checks.timeout_value {
                errors.push(format!(
                    "Timeout too short: {} < required {}",
                    timeout, self.min_timeout
                ));
            }
        }
        
        // Verify address derivation
        let derived_address = Address::p2sh(script, self.network);
        checks.address_derivation = derived_address.to_string() == self.expected_address;
        
        let valid = checks.all_valid();
        
        Ok(VerificationResult {
            valid,
            checks,
            errors,
            timeout_height: if valid { Some(timeout) } else { None },
        })
    }
}
```

### 5. HTLC Operations (Claim & Refund)

```rust
// api/htlc_claim.rs

pub async fn claim_htlc(
    app: web::Data<AppState>,
    htlc_id: web::Path<Uuid>,
    req: web::Json<ClaimRequest>,
) -> Result<HttpResponse> {
    let htlc = app.db.get_htlc(&htlc_id).await?
        .ok_or_else(|| actix_web::error::ErrorNotFound("HTLC not found"))?;
    
    // Verify preimage matches
    let preimage = hex::decode(&req.preimage)
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    let computed_hash = sha256::Hash::hash(&preimage);
    
    let order = app.db.get_order(&htlc.order_id).await?.unwrap();
    let expected_hash = sha256::Hash::from_hex(&order.preimage_hash)?;
    
    if computed_hash != expected_hash {
        return Err(actix_web::error::ErrorBadRequest("Invalid preimage"));
    }
    
    // Build claim transaction
    let claim_address = if let Some(addr) = &req.claim_address {
        Address::from_str(addr)?
    } else {
        app.bitcoin_wallet.get_new_address().await?
    };
    
    let claim_tx = build_htlc_claim_transaction(
        &htlc,
        &preimage,
        &claim_address,
        &order.user_bitcoin_pubkey.unwrap(),
    )?;
    
    // Broadcast transaction
    let txid = app.bitcoin_rpc.send_raw_transaction(&claim_tx).await?;
    
    // Update HTLC status
    app.db.update_htlc_status(&htlc_id, HtlcStatus::Claimed).await?;
    app.db.update_htlc_claim_tx(&htlc_id, &txid).await?;
    
    // Update order status if this completes the swap
    if order.direction == SwapDirection::EthToBtc {
        app.db.update_order_status(&order.id, OrderStatus::Completed).await?;
    }
    
    Ok(HttpResponse::Ok().json(ClaimResponse {
        tx_id: txid.to_string(),
        claim_address: claim_address.to_string(),
        amount: htlc.amount.to_string(),
    }))
}

// api/htlc_refund.rs

pub async fn refund_htlc(
    app: web::Data<AppState>,
    htlc_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let htlc = app.db.get_htlc(&htlc_id).await?
        .ok_or_else(|| actix_web::error::ErrorNotFound("HTLC not found"))?;
    
    // Check if timeout reached
    let current_height = app.bitcoin_rpc.get_block_count().await?;
    if current_height < htlc.timeout_height {
        return Err(actix_web::error::ErrorConflict(format!(
            "Timeout not reached. Current: {}, Required: {}",
            current_height, htlc.timeout_height
        )));
    }
    
    // Only resolver can refund
    let order = app.db.get_order(&htlc.order_id).await?.unwrap();
    let resolver_privkey = app.bitcoin_wallet.get_resolver_privkey()?;
    
    // Build refund transaction
    let refund_address = app.bitcoin_wallet.get_refund_address().await?;
    let refund_tx = build_htlc_refund_transaction(
        &htlc,
        &refund_address,
        &resolver_privkey,
        htlc.timeout_height,
    )?;
    
    // Broadcast transaction
    let txid = app.bitcoin_rpc.send_raw_transaction(&refund_tx).await?;
    
    // Update status
    app.db.update_htlc_status(&htlc_id, HtlcStatus::Refunded).await?;
    app.db.update_order_status(&order.id, OrderStatus::Refunded).await?;
    
    Ok(HttpResponse::Ok().json(RefundResponse {
        tx_id: txid.to_string(),
        refund_address: refund_address.to_string(),
        amount: htlc.amount.to_string(),
    }))
}
```

### 6. Bitcoin Monitoring

```rust
// bitcoin/monitor.rs

pub struct BitcoinMonitor {
    rpc: BitcoinRpc,
    db: Database,
    fusion_client: FusionClient,
}

impl BitcoinMonitor {
    pub async fn run(&self) {
        loop {
            self.check_pending_orders().await?;
            self.check_htlc_claims().await?;
            tokio::time::sleep(Duration::from_secs(10)).await;
        }
    }
    
    async fn check_pending_orders(&self) -> Result<()> {
        let orders = self.db.get_orders_by_status(&[
            OrderStatus::BitcoinHtlcFunded,
            OrderStatus::BitcoinHtlcVerified,
            OrderStatus::BitcoinHtlcFundedUnconfirmed,
        ]).await?;
        
        for order in orders {
            match order.status {
                OrderStatus::BitcoinHtlcFunded => {
                    // For ETH->BTC: Check if we can fill Fusion+ order
                    if order.direction == SwapDirection::EthToBtc {
                        let htlc = self.db.get_htlc(&order.bitcoin_htlc_id.unwrap()).await?;
                        
                        // Check funding confirmations
                        let confirmations = self.get_tx_confirmations(&htlc.funding_tx_id).await?;
                        
                        if confirmations >= order.confirmation_requirements.bitcoin {
                            // Ready to fill Fusion+ order
                            self.db.update_order_status(
                                &order.id, 
                                OrderStatus::FusionOrderFillable
                            ).await?;
                        }
                    }
                }
                OrderStatus::BitcoinHtlcVerified => {
                    // For BTC->ETH: Check if user funded their HTLC
                    if order.direction == SwapDirection::BtcToEth {
                        let htlc = self.db.get_htlc_by_order(&order.id).await?;
                        
                        // Check for funding
                        let utxos = self.rpc.list_unspent(0, 9999999, vec![&htlc.address]).await?;
                        
                        for utxo in utxos {
                            if utxo.amount >= htlc.amount {
                                // HTLC funded!
                                self.db.update_htlc_funding(&htlc.id, &utxo.txid).await?;
                                self.db.update_order_status(
                                    &order.id,
                                    OrderStatus::BitcoinHtlcFundedUnconfirmed
                                ).await?;
                                
                                // Send webhook
                                self.send_webhook_event(&order.id, "order.bitcoin_htlc_funded").await?;
                            }
                        }
                    }
                }
                OrderStatus::BitcoinHtlcFundedUnconfirmed => {
                    // Wait for confirmations
                    let htlc = self.db.get_htlc_by_order(&order.id).await?;
                    let confirmations = self.get_tx_confirmations(&htlc.funding_tx_id).await?;
                    
                    if confirmations >= order.confirmation_requirements.bitcoin {
                        self.db.update_order_status(
                            &order.id,
                            OrderStatus::BitcoinHtlcConfirmed
                        ).await?;
                        
                        // If we have Fusion+ proof, start filling
                        if order.fusion_order_id.is_some() {
                            self.fill_fusion_order(&order).await?;
                        }
                    }
                }
                _ => {}
            }
        }
        
        Ok(())
    }
    
    async fn check_htlc_claims(&self) -> Result<()> {
        // Monitor for preimage reveals
        let orders = self.db.get_orders_by_status(&[
            OrderStatus::FusionOrderFilled,
        ]).await?;
        
        for order in orders {
            if order.direction == SwapDirection::EthToBtc {
                // Check if user claimed BTC (reveals preimage)
                let htlc = self.db.get_htlc(&order.bitcoin_htlc_id.unwrap()).await?;
                
                if let Some(claim_tx) = self.find_htlc_claim_tx(&htlc.address).await? {
                    if let Some(preimage) = self.extract_preimage_from_tx(&claim_tx)? {
                        // Preimage revealed! Swap completed
                        self.db.update_order_status(
                            &order.id,
                            OrderStatus::PreimageRevealed
                        ).await?;
                        self.db.update_order_status(
                            &order.id,
                            OrderStatus::Completed
                        ).await?;
                        
                        info!("Swap {} completed! Preimage: {}", order.id, hex::encode(&preimage));
                    }
                }
            }
        }
        
        Ok(())
    }
}
```

### 7. Health Check & Fee Estimation

```rust
// api/health.rs

pub async fn health_check(
    app: web::Data<AppState>,
) -> Result<HttpResponse> {
    let mut status = HealthStatus {
        status: ServiceStatus::Healthy,
        timestamp: Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        dependencies: Dependencies::default(),
        resolver: None,
    };
    
    // Check Bitcoin node
    match app.bitcoin_rpc.get_block_count().await {
        Ok(height) => {
            status.dependencies.bitcoin_node = BitcoinNodeStatus {
                connected: true,
                block_height: Some(height),
                network: Some(app.network.to_string()),
                latency: Some(10), // TODO: Measure actual latency
            };
        }
        Err(_) => {
            status.status = ServiceStatus::Degraded;
            status.dependencies.bitcoin_node.connected = false;
        }
    }
    
    // Check Ethereum RPC
    match app.ethereum_rpc.get_block_number().await {
        Ok(block_num) => {
            status.dependencies.ethereum_rpc = EthereumRpcStatus {
                connected: true,
                chain_id: Some(app.chain_id),
                block_number: Some(block_num),
                latency: Some(15),
            };
        }
        Err(_) => {
            status.status = ServiceStatus::Degraded;
            status.dependencies.ethereum_rpc.connected = false;
        }
    }
    
    // Check database
    match app.db.health_check().await {
        Ok(_) => {
            status.dependencies.database = DatabaseStatus {
                connected: true,
                latency: Some(5),
            };
        }
        Err(_) => {
            status.status = ServiceStatus::Unhealthy;
            status.dependencies.database.connected = false;
        }
    }
    
    // Check resolver balances
    let bitcoin_balance = app.bitcoin_wallet.get_balance().await?;
    let ethereum_balance = app.ethereum_wallet.get_balance().await?;
    let active_orders = app.db.count_active_orders().await?;
    
    status.resolver = Some(ResolverStatus {
        bitcoin_balance: bitcoin_balance.to_string(),
        ethereum_balance: ethereum_balance.to_string(),
        active_orders,
    });
    
    // Return appropriate status code
    let status_code = match status.status {
        ServiceStatus::Healthy => StatusCode::OK,
        ServiceStatus::Degraded => StatusCode::OK, // Still operational
        ServiceStatus::Unhealthy => StatusCode::SERVICE_UNAVAILABLE,
    };
    
    Ok(HttpResponse::build(status_code).json(status))
}

// api/fees.rs

pub async fn estimate_fees(
    app: web::Data<AppState>,
    query: web::Query<FeeEstimateQuery>,
) -> Result<HttpResponse> {
    let amount = parse_amount(&query.amount)?;
    
    // Get current network fees
    let btc_fee_rate = app.bitcoin_rpc.estimate_smart_fee(
        if query.urgent.unwrap_or(false) { 2 } else { 6 }
    ).await?;
    
    let eth_gas_price = app.ethereum_rpc.get_gas_price().await?;
    
    // Calculate fees based on direction
    let (bitcoin_fee, ethereum_fee, resolver_fee) = match query.direction {
        SwapDirection::EthToBtc => {
            // ETH->BTC: User pays ETH gas, resolver pays BTC fees
            let eth_gas_limit = 150_000u64; // Fusion+ fill gas
            let eth_fee = eth_gas_price * eth_gas_limit;
            
            // Resolver covers BTC HTLC creation (2 transactions)
            let btc_vsize = 250; // P2SH HTLC funding
            let btc_fee = btc_fee_rate.feerate * btc_vsize * 2; // Fund + claim/refund
            
            // Resolver fee: 0.5% + network costs
            let resolver_percentage = 0.005;
            let resolver_amount = (amount as f64 * resolver_percentage) as u64 
                + btc_fee;
            
            (btc_fee, eth_fee, resolver_amount)
        }
        SwapDirection::BtcToEth => {
            // BTC->ETH: User pays BTC fees, resolver pays ETH gas
            let btc_vsize = 300; // User's HTLC creation + claim
            let btc_fee = btc_fee_rate.feerate * btc_vsize;
            
            let eth_gas_limit = 200_000u64; // Fusion+ creation + fill
            let eth_fee = eth_gas_price * eth_gas_limit;
            
            // Resolver fee: 0.5% + network costs
            let resolver_percentage = 0.005;
            let resolver_amount = (amount as f64 * resolver_percentage) as u64 
                + eth_fee.as_u64();
            
            (btc_fee, eth_fee.as_u64(), resolver_amount)
        }
    };
    
    // Calculate total fees
    let total_input_fee = match query.direction {
        SwapDirection::EthToBtc => ethereum_fee + resolver_fee,
        SwapDirection::BtcToEth => bitcoin_fee + resolver_fee,
    };
    
    let total_percentage = (total_input_fee as f64 / amount as f64) * 100.0;
    
    // Build warnings
    let mut warnings = vec![];
    
    if btc_fee_rate.feerate > 50 {
        warnings.push("High Bitcoin network congestion - fees elevated".to_string());
    }
    
    if total_percentage > 5.0 {
        warnings.push("Amount too small - fees exceed 5% of swap value".to_string());
    }
    
    // Calculate minimum profitable amount
    let minimum_amount = (total_input_fee * 20) as u64; // 5% max fee
    
    Ok(HttpResponse::Ok().json(FeeEstimate {
        direction: query.direction.clone(),
        amount: query.amount.clone(),
        bitcoin_network_fee: BitcoinNetworkFee {
            satoshis: bitcoin_fee.to_string(),
            satoshis_per_vbyte: btc_fee_rate.feerate as i32,
            estimated_vsize: 250,
        },
        ethereum_gas_fee: EthereumGasFee {
            wei: ethereum_fee.to_string(),
            gas_price: eth_gas_price.to_string(),
            gas_limit: 150_000,
        },
        resolver_fee: ResolverFee {
            amount: resolver_fee.to_string(),
            percentage: 0.5,
        },
        total_fee: TotalFee {
            input_currency: total_input_fee.to_string(),
            output_currency: (amount - resolver_fee).to_string(),
            percentage: total_percentage,
        },
        estimated_time: EstimatedTime {
            bitcoin_confirmations: 3,
            ethereum_confirmations: 12,
            total_minutes: 45,
        },
        warnings,
        minimum_amount: minimum_amount.to_string(),
        maximum_amount: app.liquidity_manager.get_max_amount(&query.direction).await?,
    }))
}
```

### 8. Main Server Configuration

```rust
// main.rs
use actix_web::{web, App, HttpServer, middleware};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let config = Config::from_file("config/default.toml")?;
    
    // Validate configuration
    if config.bitcoin_timeout_blocks < config.ethereum_timeout_blocks * 2 {
        panic!("Bitcoin timeout must be at least 2x Ethereum timeout");
    }
    
    // Initialize app state
    let app_state = web::Data::new(AppState {
        bitcoin_rpc: BitcoinRpc::new(&config.bitcoin_rpc),
        bitcoin_wallet: BitcoinWallet::new(&config.bitcoin_wallet),
        db: Database::connect(&config.database_url).await?,
        fusion_client: FusionClient::new(&config.fusion_api),
        default_resolver_pubkey: PublicKey::from_str(&config.resolver_pubkey)?,
        ethereum_resolver_address: config.ethereum_resolver_address,
        network: config.bitcoin_network,
        confirmation_requirements: config.confirmation_requirements,
        default_timeouts: config.default_timeouts,
    });
    
    // Start monitors
    let monitor = BitcoinMonitor::new(app_state.clone());
    tokio::spawn(async move {
        monitor.run().await;
    });
    
    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(middleware::Logger::default())
            .wrap(ApiKeyAuth::new(&config.api_keys))
            .service(
                web::scope("/v1")
                    // Orders
                    .route("/orders", web::post().to(create_order))
                    .route("/orders/{order_id}", web::get().to(get_order))
                    .route("/orders/{order_id}/fusion-proof", 
                           web::post().to(submit_fusion_proof))
                    
                    // HTLCs
                    .route("/htlc/verify", web::post().to(verify_htlc))
                    .route("/htlc/{htlc_id}/claim", web::post().to(claim_htlc))
                    .route("/htlc/{htlc_id}/refund", web::post().to(refund_htlc))
                    
                    // Status
                    .route("/transactions/{tx_id}/status", 
                           web::get().to(get_transaction_status))
                    
                    // Webhooks
                    .route("/webhooks", web::post().to(register_webhook))
                    
                    // Health & Fees
                    .route("/health", web::get().to(health_check))
                    .route("/fees/estimate", web::get().to(estimate_fees))
            )
    })
    .bind(&config.server.bind_address)?
    .run()
    .await
}
```

## Correct Swap Flows

### ETH → BTC Flow

1. **User creates order** - Provides Bitcoin pubkey and amount
2. **API returns Fusion+ requirements** - User must create Fusion+ order first
3. **User creates Fusion+ order** - On Ethereum with resolver address
4. **User submits Fusion+ proof** - Thunder Portal verifies order
5. **Thunder Portal creates Bitcoin HTLC** - Only after Fusion+ verified
6. **Thunder Portal funds HTLC** - Locks BTC for user
7. **Resolver fills Fusion+ order** - After Bitcoin confirmations
8. **Resolver reveals preimage** - On Ethereum to claim ETH
9. **User claims BTC** - Using revealed preimage
10. **Swap complete** - Both sides settled atomically

### BTC → ETH Flow

1. **User creates order** - Provides Ethereum address and amount
2. **API returns HTLC requirements** - Script template with pubkeys
3. **User creates Bitcoin HTLC** - Following requirements
4. **User submits HTLC for verification** - Thunder Portal validates script
5. **User funds Bitcoin HTLC** - Sends BTC to P2SH address
6. **User submits Fusion+ proof** - Which order to fill
7. **Thunder Portal waits for confirmations** - Typically 3-6 blocks
8. **Thunder Portal fills Fusion+ order** - User receives ETH/tokens
9. **Thunder Portal claims BTC** - Reveals preimage
10. **Swap complete** - Both sides settled atomically

## Security Guarantees

1. **Atomic execution** - Both succeed or both fail
2. **No trust required** - Math, not promises
3. **Timeout protection** - Clean refund paths
4. **No front-running** - Preimage commitment scheme
5. **Reorg protection** - Multiple confirmations

## Testing Strategy

1. **Unit tests** - Script generation, verification
2. **Integration tests** - Full swap flows on regtest
3. **Testnet deployment** - Real Bitcoin testnet
4. **Security audit** - Focus on timeout logic

## Next Steps

1. Initialize Rust project structure
2. Implement models from OpenAPI spec
3. Build HTLC script engine with verification
4. Create API endpoints following spec
5. Add Bitcoin monitoring service
6. Integration testing on testnet
7. Security review of timeout handling