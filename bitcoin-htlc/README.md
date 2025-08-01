# Bitcoin HTLC Service

Rust service that manages Bitcoin HTLCs for Thunder Portal atomic swaps.

## Features
- Creates Bitcoin HTLCs with presigned transactions
- Manages refund timeouts
- Integrates with Bitcoin regtest/testnet
- RESTful API for HTLC operations

## API Endpoints
- `POST /v1/htlc/create` - Create new HTLC
- `GET /v1/health` - Health check
- `GET /v1/fee-estimate` - Get fee estimates

Part of Thunder Portal - see main README for demo instructions.