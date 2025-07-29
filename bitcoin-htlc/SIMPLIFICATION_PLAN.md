# Simplification Plan - Compliant with OpenAPI Spec

## Key Insight: The Spec Allows Simplification!

Looking at the OpenAPI spec, the `resolverPublicKey` is:
- **Optional** in CreateOrderRequest (not in required fields!)
- Only truly needed if Thunder Portal creates HTLCs

## Simplified Implementation (Still Spec Compliant)

### 1. Make Resolver Keys Optional
```yaml
resolverPublicKey:
  type: string
  description: Thunder Portal's Bitcoin public key for refunds
  # NOT in required fields - so it's optional!
```

### 2. Two Modes of Operation

#### Mode A: Simple Coordinator (Default for Demo)
- No private keys needed
- Users create their own HTLCs
- Thunder Portal just verifies and tracks
- `resolverPublicKey` can be null/empty

#### Mode B: Full Resolver (Future Enhancement)
- Requires private keys
- Thunder Portal creates HTLCs
- Can be added later without breaking API

### 3. Simplified Flow for Demo

**ETH→BTC (User-Controlled):**
1. User creates order (no resolverPublicKey needed)
2. User provides their own Bitcoin HTLC details
3. Thunder Portal verifies HTLC is correct
4. Tracks order progress

**BTC→ETH (User-Controlled):**
1. User creates order with their HTLC requirements
2. User creates Bitcoin HTLC themselves
3. Thunder Portal verifies and coordinates

### 4. API Compliance

All endpoints remain the same:
- ✅ `/orders` - Creates order (resolverPublicKey optional)
- ✅ `/htlc/verify` - Verifies user-created HTLCs
- ✅ `/htlc/{id}/claim` - Returns claim instructions
- ✅ `/htlc/{id}/refund` - Returns refund instructions
- ✅ All responses follow spec structure

### 5. Simplified Config

```env
# Minimal configuration
DATABASE_URL=sqlite://thunder_portal.db
HOST=127.0.0.1
PORT=3000
BITCOIN_NETWORK=testnet
BITCOIN_API_URL=https://blockstream.info/testnet/api

# Optional: Only if acting as resolver
# RESOLVER_PRIVATE_KEY=...
# RESOLVER_PUBLIC_KEY=...
```

### 6. Code Changes Needed

1. Make `resolver_public_key` optional in OrderService
2. Add `mode` field to track if order is resolver-based or user-controlled
3. Adjust HTLC verification to work with user-provided HTLCs
4. Update claim/refund endpoints to return instructions instead of executing

## Benefits

1. **Spec Compliant**: All API endpoints work as documented
2. **Simpler Demo**: No key management needed
3. **Progressive Enhancement**: Can add resolver mode later
4. **Clearer Architecture**: Obviously non-custodial
5. **Same API**: Frontend doesn't need to change