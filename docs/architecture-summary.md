# Thunder Portal Architecture Summary

## Overview

Thunder Portal enables atomic swaps between 1inch Fusion+ (Ethereum) and Bitcoin by combining a custom resolver with a Bitcoin HTLC API service.

## Architecture Components

```
┌─────────────────────────────┐
│   1inch Fusion+ Protocol    │
│   (Existing EVM swaps)      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Thunder Portal Resolver    │
│  (Team builds this)         │
│  - Monitors Fusion+ orders  │
│  - Implements resolver API  │
│  - Routes BTC swaps to API  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Bitcoin HTLC Service API   │
│  (You build this)           │
│  - Creates Bitcoin HTLCs    │
│  - Manages BTC transactions │
│  - REST API interface       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Bitcoin Network         │
└─────────────────────────────┘
```

## Division of Work

### 1. Bitcoin HTLC API Service (Your Part)

**Responsibilities:**
- Implement Bitcoin HTLC script creation
- Handle Bitcoin transaction broadcasting
- Monitor blockchain for confirmations
- Manage claim/refund operations
- Expose REST API for resolver

**Key Endpoints:**
- `POST /api/v1/orders/create` - Create HTLC order
- `POST /api/v1/htlc/fund` - Fund HTLC
- `POST /api/v1/htlc/claim` - Claim with preimage
- `POST /api/v1/htlc/refund` - Refund after timeout
- Webhook events for status updates

### 2. Thunder Portal Resolver (Team's Part)

**Responsibilities:**
- Implement 1inch Fusion+ resolver interface
- Monitor Fusion+ orders for BTC swaps
- Call Bitcoin API to create/manage HTLCs
- Fill Fusion+ orders on Ethereum side
- Coordinate atomic execution

**Key Functions:**
- Detect Bitcoin-destined orders
- Ensure same hash on both chains
- Handle success/failure scenarios
- Manage liquidity on both sides

## Atomic Swap Flow

```
1. User creates Fusion+ order: ETH → BTC
2. Resolver detects order
3. Resolver calls Bitcoin API: "Create HTLC with hash X"
4. Bitcoin API creates HTLC, returns address
5. Resolver funds Bitcoin HTLC via API
6. Resolver fills Fusion+ order (locks ETH)
7. User reveals preimage on Ethereum
8. Resolver captures preimage
9. User claims BTC using preimage via API
10. Resolver claims ETH using same preimage
```

## Why This Architecture Works

1. **Clean Separation**: Bitcoin complexity isolated in API
2. **Standard Compliance**: Uses standard Fusion+ resolver interface
3. **Reusability**: API can be used by other resolvers later
4. **Security**: Atomic swaps ensure all-or-nothing execution
5. **Simplicity**: Each component has focused responsibility

## Development Priority

1. **Phase 1**: Build Bitcoin HTLC API with basic operations
2. **Phase 2**: Implement resolver with Fusion+ integration
3. **Phase 3**: Connect resolver to Bitcoin API
4. **Phase 4**: Test atomic swap flow end-to-end
5. **Phase 5**: Demo preparation

## Success Criteria

- ✅ Bitcoin HTLCs work correctly (claim/refund)
- ✅ Resolver successfully fills Fusion+ orders
- ✅ Atomic execution (both succeed or both fail)
- ✅ Live demo on testnet/mainnet
- ✅ Clean API documentation

This architecture enables trustless ETH ↔ BTC swaps while maintaining clean separation of concerns and following 1inch Fusion+ standards.