# Bitcoin HTLC Implementation for Thunder Portal

## Overview

Implementation plan for Thunder Portal's Bitcoin HTLC service following the cross-chain swap API specification for ETH ↔ BTC atomic swaps via 1inch Fusion+.

## Architecture

```
thunder-portal/
├── bitcoin-htlc/               # Rust service
│   ├── src/
│   │   ├── main.rs            # Actix-web server
│   │   ├── api/               # API endpoints
│   │   │   ├── quotes.rs      # GET/POST /quotes
│   │   │   ├── orders.rs      # POST /orders, GET /orders/:id
│   │   │   ├── fusion.rs      # POST /orders/:id/fusion-proof
│   │   │   └── htlc.rs        # POST /htlc/:id/claim
│   │   ├── models/            # Request/response types from OpenAPI
│   │   │   ├── order.rs       # Order models
│   │   │   ├── quote.rs       # Quote models  
│   │   │   └── fusion.rs      # Fusion+ integration types
│   │   ├── htlc/              # Bitcoin HTLC logic
│   │   │   ├── builder.rs     # P2SH HTLC construction
│   │   │   ├── spender.rs     # Transaction building
│   │   │   └── monitor.rs     # Bitcoin network monitoring
│   │   ├── fusion/            # Fusion+ coordination
│   │   │   └── resolver.rs    # Resolver communication
│   │   └── db/                # Database layer
│   ├── Cargo.toml
│   └── Dockerfile
└── openapi-spec.yaml          # API specification
```

## Core Implementation

### 1. Models (Matching OpenAPI Spec)

```rust
// models/order.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SwapDirection {
    EthToBtc,
    BtcToEth,
}

#[derive(Deserialize, Serialize)]
pub struct TokenInfo {
    pub symbol: String,        // ETH, USDC, USDT, etc.
    pub address: String,       // 0x0 for ETH
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub direction: SwapDirection,
    pub amount: String,        // In smallest unit (wei/sats)
    pub quote_id: Option<Uuid>,
    
    // For ETH_TO_BTC
    pub from_token: Option<TokenInfo>,
    pub bitcoin_address: Option<String>,
    pub bitcoin_public_key: Option<String>,
    
    // For BTC_TO_ETH  
    pub to_token: Option<TokenInfo>,
    pub ethereum_address: Option<String>,
    
    // HTLC params
    pub preimage_hash: String,
    
    // Fusion+ data
    pub fusion_order_data: Option<FusionOrderData>,
}

#[derive(Serialize)]
pub struct CreateOrderResponse {
    pub order_id: Uuid,
    pub direction: SwapDirection,
    pub status: OrderStatus,
    pub bitcoin_htlc: Option<BitcoinHtlcDetails>,
    pub bitcoin_deposit: Option<BitcoinDepositDetails>,
    pub expires_at: DateTime<Utc>,
}
```

### 2. Bitcoin HTLC Implementation

```rust
// htlc/builder.rs
use bitcoin::{
    blockdata::{opcodes, script::Builder},
    hashes::{sha256, Hash},
    PublicKey, Script, Network, Address,
};

pub struct HtlcParams {
    pub user_pubkey: PublicKey,      // User can claim with preimage
    pub resolver_pubkey: PublicKey,  // Resolver can refund after timeout
    pub payment_hash: sha256::Hash,   // Hash of the secret
    pub timeout: u32,                 // Absolute block height
}

impl HtlcParams {
    /// Build P2SH HTLC script for atomic swaps
    pub fn build_script(&self) -> Script {
        Builder::new()
            // Claim path: User reveals preimage
            .push_opcode(opcodes::all::OP_IF)
                .push_opcode(opcodes::all::OP_SHA256)
                .push_slice(&self.payment_hash[..])
                .push_opcode(opcodes::all::OP_EQUALVERIFY)
                .push_key(&self.user_pubkey)
                .push_opcode(opcodes::all::OP_CHECKSIG)
            // Refund path: Resolver reclaims after timeout
            .push_opcode(opcodes::all::OP_ELSE)
                .push_int(self.timeout as i64)
                .push_opcode(opcodes::all::OP_CHECKLOCKTIMEVERIFY)
                .push_opcode(opcodes::all::OP_DROP)
                .push_key(&self.resolver_pubkey)
                .push_opcode(opcodes::all::OP_CHECKSIG)
            .push_opcode(opcodes::all::OP_ENDIF)
            .into_script()
    }
    
    pub fn to_p2sh_address(&self, network: Network) -> Address {
        Address::p2sh(&self.build_script(), network)
    }
}
```

### 3. API Implementation

```rust
// api/orders.rs
use actix_web::{web, HttpResponse, Result};
use crate::models::*;

/// POST /v1/orders - Create cross-chain swap order
pub async fn create_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    match req.direction {
        SwapDirection::EthToBtc => create_eth_to_btc_order(app, req).await,
        SwapDirection::BtcToEth => create_btc_to_eth_order(app, req).await,
    }
}

async fn create_eth_to_btc_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    // Validate ETH->BTC specific fields
    let bitcoin_pubkey = PublicKey::from_str(
        req.bitcoin_public_key.as_ref()
            .ok_or_else(|| actix_web::error::ErrorBadRequest("bitcoin_public_key required"))?
    )?;
    
    let bitcoin_address = req.bitcoin_address.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("bitcoin_address required"))?;
    
    // Parse preimage hash
    let payment_hash = sha256::Hash::from_hex(&req.preimage_hash)?;
    
    // Calculate timeout (must be > Ethereum timeout)
    let current_height = app.bitcoin_rpc.get_block_count().await?;
    let timeout_height = current_height + BITCOIN_TIMEOUT_BLOCKS; // 144 blocks
    
    // Create HTLC for user to claim BTC
    let htlc = HtlcParams {
        user_pubkey: bitcoin_pubkey,          // User claims with preimage
        resolver_pubkey: app.resolver_pubkey,  // We refund on timeout
        payment_hash,
        timeout: timeout_height,
    };
    
    let htlc_script = htlc.build_script();
    let htlc_address = htlc.to_p2sh_address(app.network);
    
    // Calculate BTC amount based on exchange rate
    let btc_amount = calculate_btc_amount(&req.amount, &req.from_token)?;
    
    // Create order in database
    let order_id = Uuid::new_v4();
    let htlc_id = Uuid::new_v4();
    
    let order = Order {
        id: order_id,
        direction: SwapDirection::EthToBtc,
        status: OrderStatus::Created,
        from_amount: req.amount.clone(),
        to_amount: btc_amount.to_string(),
        from_token: req.from_token.clone(),
        bitcoin_htlc_id: Some(htlc_id),
        fusion_order_data: req.fusion_order_data.clone(),
        created_at: Utc::now(),
    };
    
    app.db.create_order(&order).await?;
    
    // Create HTLC record
    app.db.create_htlc(&HtlcRecord {
        id: htlc_id,
        order_id,
        address: htlc_address.to_string(),
        script: htlc_script.to_hex(),
        amount: btc_amount,
        timeout_height,
        status: HtlcStatus::Unfunded,
    }).await?;
    
    // Fund the HTLC with resolver's BTC
    let funding_tx = app.bitcoin_wallet
        .fund_htlc(&htlc_address, btc_amount)
        .await?;
    
    Ok(HttpResponse::Created().json(CreateOrderResponse {
        order_id,
        direction: SwapDirection::EthToBtc,
        status: OrderStatus::Created,
        bitcoin_htlc: Some(BitcoinHtlcDetails {
            htlc_id,
            address: htlc_address.to_string(),
            redeem_script: htlc_script.to_hex(),
            timeout_height,
            amount: btc_amount.to_string(),
        }),
        bitcoin_deposit: None,
        expires_at: Utc::now() + Duration::hours(4),
    }))
}

async fn create_btc_to_eth_order(
    app: web::Data<AppState>,
    req: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse> {
    // For BTC->ETH: User sends BTC first, then we fill Fusion+ order
    
    // Validate BTC->ETH specific fields
    let ethereum_address = req.ethereum_address.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("ethereum_address required"))?;
    
    let to_token = req.to_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("to_token required"))?;
    
    // Create Bitcoin deposit address (regular P2PKH, not HTLC yet)
    let deposit_address = app.bitcoin_wallet.get_deposit_address().await?;
    
    // Calculate amounts
    let eth_amount = calculate_eth_amount(&req.amount, to_token)?;
    
    // Create order
    let order_id = Uuid::new_v4();
    
    let order = Order {
        id: order_id,
        direction: SwapDirection::BtcToEth,
        status: OrderStatus::WaitingForBitcoinDeposit,
        from_amount: req.amount.clone(),
        to_amount: eth_amount.to_string(),
        to_token: Some(to_token.clone()),
        ethereum_address: Some(ethereum_address.clone()),
        bitcoin_deposit_address: Some(deposit_address.to_string()),
        preimage_hash: req.preimage_hash.clone(),
        created_at: Utc::now(),
    };
    
    app.db.create_order(&order).await?;
    
    Ok(HttpResponse::Created().json(CreateOrderResponse {
        order_id,
        direction: SwapDirection::BtcToEth,
        status: OrderStatus::WaitingForBitcoinDeposit,
        bitcoin_htlc: None,
        bitcoin_deposit: Some(BitcoinDepositDetails {
            address: deposit_address.to_string(),
            amount: req.amount.clone(),
            timeout_height: app.bitcoin_rpc.get_block_count().await? + 144,
        }),
        expires_at: Utc::now() + Duration::hours(4),
    }))
}
```

### 4. Fusion+ Integration

```rust
// api/fusion.rs

/// POST /v1/orders/{orderId}/fusion-proof
/// For BTC->ETH: User submits proof of Fusion+ order creation
pub async fn submit_fusion_proof(
    app: web::Data<AppState>,
    order_id: web::Path<Uuid>,
    req: web::Json<FusionProofRequest>,
) -> Result<HttpResponse> {
    let order = app.db.get_order(&order_id).await?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Order not found"))?;
    
    // Verify this is a BTC->ETH order waiting for Fusion proof
    if order.direction != SwapDirection::BtcToEth {
        return Err(actix_web::error::ErrorBadRequest("Not a BTC to ETH order"));
    }
    
    if order.status != OrderStatus::WaitingForFusionOrder {
        return Err(actix_web::error::ErrorBadRequest("Order not waiting for Fusion proof"));
    }
    
    // Verify the Fusion+ order matches our expectations
    verify_fusion_order(&req, &order)?;
    
    // Store Fusion+ order details
    app.db.update_order_fusion_data(&order_id, &req).await?;
    
    // Update order status
    app.db.update_order_status(&order_id, OrderStatus::WaitingForBitcoinDeposit).await?;
    
    Ok(HttpResponse::Ok().json(FusionProofResponse {
        accepted: true,
        bitcoin_deposit_address: order.bitcoin_deposit_address.unwrap(),
    }))
}
```

### 5. Bitcoin Monitoring

```rust
// htlc/monitor.rs

pub struct BitcoinMonitor {
    bitcoin_rpc: BitcoinRpc,
    db: Database,
    fusion_client: FusionClient,
}

impl BitcoinMonitor {
    /// Monitor for Bitcoin deposits and HTLC claims
    pub async fn run(&self) {
        loop {
            // Check pending orders
            let pending_orders = self.db.get_pending_orders().await?;
            
            for order in pending_orders {
                match order.direction {
                    SwapDirection::EthToBtc => {
                        // Monitor if user claimed BTC (reveals preimage)
                        self.check_htlc_claim(&order).await?;
                    }
                    SwapDirection::BtcToEth => {
                        // Monitor for user's BTC deposit
                        self.check_bitcoin_deposit(&order).await?;
                    }
                }
            }
            
            tokio::time::sleep(Duration::from_secs(10)).await;
        }
    }
    
    async fn check_bitcoin_deposit(&self, order: &Order) -> Result<()> {
        let deposit_address = order.bitcoin_deposit_address.as_ref().unwrap();
        
        // Check for deposits to this address
        let utxos = self.bitcoin_rpc
            .list_unspent(1, 9999999, vec![deposit_address])
            .await?;
        
        for utxo in utxos {
            if utxo.amount >= order.from_amount_sats() {
                // Deposit confirmed! Now fill the Fusion+ order
                
                // Update order status
                self.db.update_order_status(
                    &order.id, 
                    OrderStatus::FusionOrderFilling
                ).await?;
                
                // Fill Fusion+ order on Ethereum
                let tx_hash = self.fusion_client
                    .fill_order(&order.fusion_order_data.unwrap())
                    .await?;
                
                // Update with Ethereum tx
                self.db.add_ethereum_transaction(&order.id, &tx_hash).await?;
                
                info!("Filled Fusion+ order {} for BTC->ETH swap", order.id);
            }
        }
        
        Ok(())
    }
    
    async fn check_htlc_claim(&self, order: &Order) -> Result<()> {
        let htlc = self.db.get_htlc(&order.bitcoin_htlc_id.unwrap()).await?;
        
        // Check if HTLC was claimed (reveals preimage)
        let tx = self.bitcoin_rpc.get_raw_transaction(&htlc.claim_txid).await?;
        
        if let Some(witness) = extract_witness_from_tx(&tx) {
            if let Some(preimage) = extract_preimage_from_witness(&witness) {
                // User revealed preimage! Swap completed
                self.db.update_order_status(&order.id, OrderStatus::Completed).await?;
                
                info!("ETH->BTC swap {} completed! Preimage: {}", order.id, hex::encode(&preimage));
            }
        }
        
        Ok(())
    }
}
```

### 6. Main Server Setup

```rust
// main.rs
use actix_web::{web, App, HttpServer, middleware};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let config = Config::from_env();
    
    // Initialize app state
    let app_state = web::Data::new(AppState {
        bitcoin_rpc: BitcoinRpc::new(&config.bitcoin_rpc_url),
        bitcoin_wallet: BitcoinWallet::new(&config),
        db: Database::connect(&config.database_url).await?,
        fusion_client: FusionClient::new(&config.fusion_resolver_url),
        resolver_pubkey: PublicKey::from_str(&config.resolver_pubkey)?,
        network: config.bitcoin_network,
    });
    
    // Start Bitcoin monitor in background
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
                    // Quotes
                    .route("/quotes", web::post().to(create_quote))
                    
                    // Orders
                    .route("/orders", web::post().to(create_order))
                    .route("/orders/{order_id}", web::get().to(get_order))
                    .route("/orders/{order_id}/fusion-proof", 
                           web::post().to(submit_fusion_proof))
                    
                    // HTLCs
                    .route("/htlc/{htlc_id}/claim", web::post().to(claim_htlc))
                    
                    // Status
                    .route("/transactions/{tx_id}/status", 
                           web::get().to(get_transaction_status))
                    
                    // Webhooks
                    .route("/webhooks", web::post().to(register_webhook))
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Swap Flow Implementation

### ETH → BTC Flow

1. **User creates order** with ETH amount and Bitcoin pubkey
2. **Thunder Portal creates Bitcoin HTLC** locked with user's pubkey
3. **User creates Fusion+ order** on Ethereum with same preimage hash
4. **Resolver fills Fusion+ order** after Bitcoin HTLC is funded
5. **Resolver reveals preimage** on Ethereum to claim ETH
6. **User uses preimage** to claim BTC from HTLC

### BTC → ETH Flow

1. **User creates order** with BTC amount and Ethereum address
2. **User creates Fusion+ order** on Ethereum (unfilled)
3. **User submits Fusion+ proof** to Thunder Portal
4. **User deposits BTC** to provided address
5. **Thunder Portal fills Fusion+ order** after BTC confirmed
6. **User receives ETH/tokens** from filled Fusion+ order

## Key Differences from Previous Implementation

1. **Proper swap direction handling** - ETH_TO_BTC vs BTC_TO_ETH
2. **Token support** - Not just ETH, but USDC, USDT, etc.
3. **Fusion+ order lifecycle** - Proper integration with 1inch
4. **No submarine/reverse swaps** - Only cross-chain swaps
5. **Order-centric API** - Not HTLC-centric

## Security Considerations

1. **Timeout hierarchy** - Bitcoin timeout (144 blocks) > Ethereum timeout (300 blocks)
2. **Atomic guarantees** - Both succeed or both fail
3. **No double-spend** - Wait for confirmations before proceeding
4. **API key auth** - All endpoints require valid API key

## Next Steps

1. Initialize Rust project with `cargo init`
2. Add dependencies to Cargo.toml
3. Implement models matching OpenAPI spec
4. Build HTLC script engine
5. Create API endpoints
6. Add Bitcoin monitoring
7. Test with regtest/testnet
8. Deploy with Docker