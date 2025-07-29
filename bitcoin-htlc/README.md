# Thunder Portal - Bitcoin HTLC Service

A non-custodial cross-chain swap coordinator for Bitcoin ↔ Ethereum atomic swaps using HTLCs.

## Quick Start (Bitcoin Testnet)

### 1. Setup
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and setup
git clone <repository>
cd bitcoin-htlc

# Configure for testnet
cp .env.testnet .env

# Build and run
cargo build --release
cargo run
```

### 2. Run Demo
```bash
# Complete testnet demo
./demo/testnet_demo.sh
```

This will:
- Create a swap order
- Show you how to fund an HTLC
- Verify the HTLC on-chain
- Track the transaction

### 3. View API Documentation
Open http://localhost:3000/swagger-ui

## Project Structure
```
bitcoin-htlc/
├── src/              # Source code
├── demo/             # Demo scripts
├── migrations/       # Database schemas
├── .env.testnet      # Testnet configuration
└── TESTNET_TUTORIAL.md  # Complete tutorial
```

## Requirements
- Rust 1.70+
- SQLite
- Bitcoin testnet wallet
- 0.002 testnet BTC (get from faucets)

## API Endpoints
- `POST /v1/orders` - Create swap order
- `POST /v1/htlc/verify` - Verify HTLC
- `GET /v1/transactions/{txId}/status` - Track transaction
- `GET /v1/health` - Service health

## Testnet Resources
- Faucet: https://bitcoinfaucet.uo1.net/
- Explorer: https://blockstream.info/testnet/
- Tutorial: See [TESTNET_TUTORIAL.md](TESTNET_TUTORIAL.md)

## License
MIT