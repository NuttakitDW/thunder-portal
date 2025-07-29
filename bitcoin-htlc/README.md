# Thunder Portal Bitcoin HTLC Service

A Rust-based backend service that enables trustless atomic swaps between Bitcoin and Ethereum using HTLCs (Hash Time Locked Contracts). This service acts as a bridge for 1inch Fusion+ protocol to support native Bitcoin integration.

## Features

- 🔒 **Trustless Atomic Swaps** - No custody, pure cryptographic guarantees
- 🔄 **Bidirectional Support** - Both ETH→BTC and BTC→ETH swaps
- ⚡ **Bitcoin Testnet Ready** - Full testnet support for safe testing
- 🛡️ **Timeout Protection** - Automatic refunds after timeout
- 📡 **RESTful API** - Clean API matching OpenAPI specification
- 🔍 **Transaction Monitoring** - Real-time status tracking

## Prerequisites

- Rust 1.70+ (install from [rustup.rs](https://rustup.rs/))
- SQLite 3
- Bitcoin testnet coins (get from faucets)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd thunder-portal/bitcoin-htlc

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your favorite editor
```

### 2. Configure Environment

Key configuration in `.env`:

```bash
# Use testnet for development
BITCOIN_NETWORK=testnet
BITCOIN_API_URL=https://blockstream.info/testnet/api

# IMPORTANT: Generate your own keys for production!
# For testnet, you can use the example keys
RESOLVER_PRIVATE_KEY=<your-private-key>
RESOLVER_PUBLIC_KEY=<your-public-key>
```

### 3. Generate Bitcoin Keys (Optional)

If you need to generate new keys for testing:

```bash
# Install Bitcoin Core tools or use this Rust snippet
cargo run --example generate_keys
```

Or use this code:
```rust
use bitcoin::secp256k1::{rand, Secp256k1};
use bitcoin::{PrivateKey, Network};

let secp = Secp256k1::new();
let (secret_key, _) = secp.generate_keypair(&mut rand::thread_rng());
let private_key = PrivateKey::new(secret_key, Network::Testnet);
println!("Private Key: {}", private_key);
println!("Public Key: {}", private_key.public_key(&secp));
```

### 4. Build and Run

```bash
# Install dependencies and build
cargo build --release

# Run database migrations
cargo sqlx migrate run

# Start the service
cargo run --release

# Or for development with auto-reload
cargo install cargo-watch
cargo watch -x run
```

The service will start on `http://localhost:3000`

### 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/v1/health

# Should return:
# {"status":"healthy","service":"Thunder Portal Bitcoin HTLC Service"}
```

## API Usage Examples

### Create ETH→BTC Swap Order

```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "ETH_TO_BTC",
    "bitcoin_amount": 100000,
    "bitcoin_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoin_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "preimage_hash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

### Submit Fusion+ Proof

```bash
curl -X POST http://localhost:3000/v1/orders/{order_id}/fusion-proof \
  -H "Content-Type: application/json" \
  -d '{
    "fusion_order_id": "123456",
    "fusion_order_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "fusion_order_signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  }'
```

### Verify Bitcoin HTLC

```bash
curl -X POST http://localhost:3000/v1/htlc/verify \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_hex": "0200000001...",
    "output_index": 0,
    "expected_amount": 100000,
    "expected_payment_hash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "expected_recipient_pubkey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "expected_sender_pubkey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
  }'
```

## Testing on Bitcoin Testnet

### 1. Get Testnet Bitcoin

Visit one of these faucets:
- https://bitcoinfaucet.uo1.net/
- https://testnet-faucet.com/btc-testnet/
- https://coinfaucet.eu/en/btc-testnet/

### 2. Create and Fund HTLC

```bash
# 1. Create an order
ORDER_ID=$(curl -X POST http://localhost:3000/v1/orders ... | jq -r '.order_id')

# 2. Get HTLC address
HTLC_ADDRESS=$(curl http://localhost:3000/v1/orders/$ORDER_ID | jq -r '.htlc_details.address')

# 3. Send testnet BTC to HTLC address
# Use any Bitcoin testnet wallet to send coins

# 4. Monitor status
curl http://localhost:3000/v1/orders/$ORDER_ID | jq '.status'
```

### 3. Claim with Preimage

```bash
# After getting the preimage (from Ethereum side in real flow)
curl -X POST http://localhost:3000/v1/htlc/{htlc_id}/claim \
  -H "Content-Type: application/json" \
  -d '{
    "preimage": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  }'
```

## Development

### Run Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_htlc_creation
```

### Database Management

```bash
# Create new migration
sqlx migrate add <name>

# Run migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert

# Reset database
sqlx database drop && sqlx database create && sqlx migrate run
```

### Logging

Set log level in `.env`:
```bash
RUST_LOG=debug,thunder_portal=trace
```

Log levels: `error`, `warn`, `info`, `debug`, `trace`

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1inch Fusion+ │────▶│  Thunder Portal │────▶│ Bitcoin Network │
│    (Ethereum)   │     │   (This Service)│     │    (Testnet)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
    [Fusion Order]          [Database]              [HTLC Script]
    [EIP-712 Sig]          [Order State]            [P2SH Address]
    [Preimage Hash]        [HTLC Details]           [Transactions]
```

## HTLC Script Structure

The service creates Bitcoin HTLCs with this structure:

```
OP_IF
    # Claim path (with preimage)
    OP_SHA256 <payment_hash> OP_EQUALVERIFY
    <recipient_pubkey> OP_CHECKSIG
OP_ELSE
    # Refund path (after timeout)
    <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP
    <sender_pubkey> OP_CHECKSIG
OP_ENDIF
```

## Troubleshooting

### Common Issues

1. **"Failed to connect to Bitcoin network"**
   - Check `BITCOIN_API_URL` in `.env`
   - Ensure internet connection
   - Try alternative API: `https://api.blockcypher.com/v1/btc/test3`

2. **"Database error"**
   - Run migrations: `cargo sqlx migrate run`
   - Check `DATABASE_URL` in `.env`
   - Ensure write permissions in project directory

3. **"Invalid public key"**
   - Ensure keys are in correct format (hex, 66 characters)
   - Verify network matches (testnet vs mainnet)

### Debug Mode

Enable detailed logging:
```bash
RUST_LOG=trace cargo run
```

## Security Considerations

⚠️ **IMPORTANT**: 
- Never use example keys in production
- Always use proper timeout values (Bitcoin timeout > Ethereum timeout)
- Validate all inputs thoroughly
- Monitor for transaction malleability
- Use adequate confirmations (3+ for testnet, 6+ for mainnet)

## Production Deployment

1. Generate secure keys
2. Use mainnet endpoints
3. Set proper fee rates
4. Enable monitoring/alerting
5. Use secure API authentication
6. Run behind reverse proxy (nginx/caddy)
7. Enable rate limiting

## API Documentation

Full API documentation available at:
- OpenAPI spec: `/api/openapi.yaml`
- When running: `http://localhost:3000/v1/docs` (if configured)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: [Create an issue](https://github.com/thunder-portal/issues)
- Documentation: [Full docs](https://docs.thunderportal.io)

---

Built with ❤️ for the 1inch Unite Hackathon