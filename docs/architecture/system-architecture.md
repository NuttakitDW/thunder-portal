# Thunder Portal System Architecture

## Overview

Thunder Portal is a cross-chain atomic swap resolver that enables trustless swaps between Ethereum and Bitcoin through 1inch Fusion+.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1inch Fusion+ Interface          Thunder Portal API            │
│  ┌────────────────────┐          ┌─────────────────┐          │
│  │                    │          │   REST API      │          │
│  │  Create Orders     │◄─────────┤   /v1/orders    │          │
│  │  Track Status      │          │   /v1/htlc      │          │
│  │  View History      │          │   /v1/health    │          │
│  └────────────────────┘          └─────────────────┘          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                       Thunder Portal Core                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Order Manager   │  │ HTLC Engine     │  │ Status Monitor │ │
│  │                 │  │                 │  │                │ │
│  │ - Create Orders │  │ - Build Scripts │  │ - Track TXs    │ │
│  │ - Validate      │  │ - Verify HTLCs  │  │ - Confirmations│ │
│  │ - State Machine │  │ - Claim/Refund  │  │ - Webhooks     │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                      Blockchain Integration                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐          ┌─────────────────────────┐ │
│  │   Bitcoin Layer     │          │   Ethereum Layer        │ │
│  │                     │          │                         │ │
│  │ - Bitcoin Core RPC  │          │ - Ethereum RPC          │ │
│  │ - P2SH HTLCs       │          │ - Fusion+ Contracts     │ │
│  │ - Transaction Build │          │ - ERC20 Support         │ │
│  │ - Fee Estimation   │          │ - Gas Management        │ │
│  └─────────────────────┘          └─────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### ETH → BTC Swap Flow

```
User                    Thunder Portal              Bitcoin              Ethereum
 │                           │                        │                     │
 ├──1. Create Order─────────►│                        │                     │
 │                           │                        │                     │
 ├──2. Fusion+ Proof────────►│                        │                     │
 │                           ├──3. Verify Fusion+─────┼────────────────────►│
 │                           │                        │                     │
 │                           ├──4. Create HTLC───────►│                     │
 │                           ├──5. Fund HTLC─────────►│                     │
 │                           │                        │                     │
 │                           ├──6. Fill Fusion+───────┼────────────────────►│
 │                           │                        │                     │
 │◄──7. Preimage Revealed────┤◄───────────────────────┼─────────────────────┤
 │                           │                        │                     │
 ├──8. Claim BTC────────────►├──9. Claim TX─────────►│                     │
 │                           │                        │                     │
 │◄──10. BTC Received────────┤◄───────────────────────┤                     │
```

### BTC → ETH Swap Flow

```
User                    Thunder Portal              Bitcoin              Ethereum
 │                           │                        │                     │
 ├──1. Create Order─────────►│                        │                     │
 │                           │                        │                     │
 ├──2. Create BTC HTLC──────┼───────────────────────►│                     │
 ├──3. Fund HTLC────────────┼───────────────────────►│                     │
 │                           │                        │                     │
 ├──4. Submit HTLC Proof────►│                        │                     │
 │                           ├──5. Verify HTLC───────►│                     │
 │                           │                        │                     │
 ├──6. Fusion+ Proof────────►│                        │                     │
 │                           ├──7. Fill Fusion+───────┼────────────────────►│
 │                           │                        │                     │
 │◄──8. ETH Received─────────┤◄───────────────────────┼─────────────────────┤
 │                           │                        │                     │
 │                           ├──9. Claim BTC─────────►│                     │
 │                           ├──10. Reveal Preimage──►│                     │
```

## Component Details

### Order Manager
- Handles order lifecycle
- Validates input parameters
- Enforces timeout hierarchy (Bitcoin > 2x Ethereum)
- Manages state transitions
- Stores order data

### HTLC Engine
- Constructs P2SH Bitcoin scripts
- Verifies user-submitted HTLCs
- Builds claim/refund transactions
- Handles preimage management

### Status Monitor
- Tracks blockchain confirmations
- Detects state changes
- Triggers webhook notifications
- Handles reorg protection

### Bitcoin Integration
- Bitcoin Core RPC connection
- UTXO management
- Fee estimation
- Transaction broadcasting
- Block monitoring

### Ethereum Integration
- Web3 provider connection
- Fusion+ contract interaction
- EIP-712 signature verification
- Gas optimization
- Event monitoring

## Security Architecture

### Atomic Guarantees
1. **Same Hash** - Both chains use identical preimage hash
2. **Timeout Hierarchy** - Bitcoin timeout > 2x Ethereum timeout
3. **No Trust** - Mathematical guarantees only
4. **Failure Recovery** - Clean refund paths

### API Security
- API key authentication
- Rate limiting
- Input validation
- Error sanitization

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    direction VARCHAR(20),
    status VARCHAR(50),
    from_amount VARCHAR(100),
    to_amount VARCHAR(100),
    preimage_hash VARCHAR(64),
    ethereum_address VARCHAR(42),
    bitcoin_address VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### HTLCs Table
```sql
CREATE TABLE htlcs (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    address VARCHAR(100),
    script TEXT,
    amount VARCHAR(100),
    timeout_height INTEGER,
    status VARCHAR(50),
    funding_tx_id VARCHAR(64),
    claim_tx_id VARCHAR(64)
);
```

## Deployment Architecture

### Production Setup
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────►│   API Server 1  │────►│   PostgreSQL    │
│                 │     │   (Rust/Actix)  │     │   Database      │
│                 │────►│                 │     │                 │
│                 │     └─────────────────┘     └─────────────────┘
│                 │     ┌─────────────────┐            │
│                 │────►│   API Server 2  │────────────┤
│                 │     │   (Rust/Actix)  │            │
└─────────────────┘     └─────────────────┘            │
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Bitcoin Node   │     │  Ethereum Node  │
                        │   (Testnet)     │     │   (Sepolia)     │
                        └─────────────────┘     └─────────────────┘
```

## Monitoring & Observability

### Metrics
- API response times
- Swap success rate
- Bitcoin/Ethereum node latency
- Order completion time

### Logs
- Structured JSON logging
- Request/response tracking
- Error aggregation
- Audit trail

### Alerts
- Service health degradation
- Low wallet balances
- Failed swaps
- Timeout approaching

## Future Enhancements

### Phase 2
- Multiple resolver support
- Partial fill capability
- Advanced fee optimization
- Lightning Network support

### Phase 3
- Multi-chain expansion (Dogecoin, Litecoin)
- Liquidity aggregation
- MEV protection
- Institutional features