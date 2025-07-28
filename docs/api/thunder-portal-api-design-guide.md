# Thunder Portal API Design Guide

## Overview

This guide explains the design decisions and patterns used in Thunder Portal's Bitcoin HTLC API, which enables atomic swaps between 1inch Fusion+ and Bitcoin.

## Design Principles

### 1. Resource-Oriented Architecture

The API follows RESTful principles with clear resource boundaries:

- **Quotes**: Temporary pricing information
- **Swaps**: Main swap lifecycle resource
- **Transactions**: Bitcoin blockchain interactions
- **Webhooks**: Event notification subscriptions

### 2. Stateless Operations

Each API call contains all necessary information. The server maintains state only for swap lifecycle management, not for client sessions.

### 3. Asynchronous by Design

Bitcoin operations are inherently asynchronous. The API provides:
- Immediate responses with status
- Webhook notifications for state changes
- Polling endpoints for status checks

## Key Design Patterns

### Swap Types

The API supports three swap types to cover all use cases:

```yaml
type:
  enum: [submarine, reverse, chain]
```

- **Submarine**: ETH/ERC20 → BTC (user sends on-chain, receives Bitcoin)
- **Reverse**: BTC → ETH/ERC20 (user sends Bitcoin, receives on-chain)
- **Chain**: BTC → BTC (atomic swap between Bitcoin addresses)

### HTLC Lifecycle

```
Created → Waiting Payment → Funded → Claimed/Refunded → Complete
```

Each state transition triggers webhook events, allowing resolvers to react promptly.

### Payment Hash Coordination

The same payment hash is used across both chains:

```javascript
// Fusion+ side
fusionOrder.secretHash = sha256(preimage)

// Bitcoin side
swapRequest.paymentHash = sha256(preimage)
```

This ensures atomic execution - revealing the preimage on one chain allows claiming on the other.

## Fusion+ Integration Patterns

### 1. Order Association

```javascript
{
  "fusionOrderId": "0x123...",  // Links to Fusion+ order
  "paymentHash": "abc123...",    // Same hash as Fusion+
  "metadata": {                  // Fusion-specific data
    "resolver": "0x456...",
    "expectedAmount": "1.5"
  }
}
```

### 2. Resolver Flow

```javascript
// 1. Detect Fusion+ order with Bitcoin destination
const order = await fusionSDK.getOrder(orderId);

// 2. Create quote
const quote = await thunderAPI.createQuote({
  type: 'submarine',
  amount: order.btcAmount,
  fromAsset: 'ETH',
  toAsset: 'BTC'
});

// 3. Create swap
const swap = await thunderAPI.createSwap({
  type: 'submarine',
  paymentHash: order.secretHash,
  amount: quote.amount,
  userPublicKey: derivedFromAddress(order.btcDestination),
  fusionOrderId: order.id
});

// 4. Monitor and execute
thunderAPI.onWebhook('swap.funded', async (event) => {
  if (event.swapId === swap.swapId) {
    await fusionSDK.fillOrder(order.id);
  }
});
```

### 3. Atomic Guarantees

The API ensures atomicity through:

1. **Shared Hash**: Same preimage hash on both chains
2. **Timeouts**: Coordinated timeout periods
3. **State Machine**: Clear state transitions
4. **Refund Path**: Automatic refunds on failure

## Security Considerations

### 1. API Authentication

```yaml
security:
  - ApiKeyAuth: []
```

Each resolver has a unique API key for:
- Request authentication
- Rate limiting
- Usage tracking
- Access control

### 2. Webhook Security

```javascript
// HMAC signature verification
const signature = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== headers['x-webhook-signature']) {
  throw new Error('Invalid signature');
}
```

### 3. HTLC Security

- **Timeout Buffers**: Fusion+ timeout < Bitcoin timeout
- **Minimum Confirmations**: Wait for sufficient confirmations
- **Script Validation**: Verify all HTLC parameters
- **Preimage Protection**: Never log or expose preimages

## Bitcoin-Specific Elements

### 1. Block-Based Timeouts

```javascript
{
  "timeoutBlocks": 144,  // ~24 hours
  "currentBlockHeight": 820000,
  "timeoutBlockHeight": 820144
}
```

Using blocks instead of timestamps ensures deterministic timeouts.

### 2. Fee Management

```javascript
{
  "minerFee": "2500",      // Sats for transaction
  "serviceFee": "5000",    // Service fee
  "totalFee": "7500"       // Total cost
}
```

Fees are explicitly separated for transparency.

### 3. UTXO Abstraction

The API abstracts UTXO management from resolvers:
- Automatic UTXO selection
- Change address handling
- Fee optimization

### 4. BIP21 Support

```javascript
{
  "bip21": "bitcoin:3Abc...?amount=0.001&label=ThunderSwap"
}
```

Enables easy wallet integration for users.

## Error Handling

### Structured Errors

```javascript
{
  "error": {
    "code": "TIMEOUT_NOT_REACHED",
    "message": "Cannot refund before block 820144",
    "details": {
      "currentBlock": 820100,
      "timeoutBlock": 820144,
      "remainingBlocks": 44
    }
  }
}
```

### Error Categories

1. **Client Errors (4xx)**
   - Invalid parameters
   - Resource not found
   - State conflicts

2. **Server Errors (5xx)**
   - Bitcoin node issues
   - Internal failures

## Performance Optimizations

### 1. Quote Caching

Quotes are cached for their validity period to reduce computation.

### 2. Batch Operations

Webhooks can batch multiple events:

```javascript
{
  "events": [
    { "event": "swap.funded", "swapId": "123" },
    { "event": "swap.funded", "swapId": "456" }
  ]
}
```

### 3. Efficient Polling

Include `If-Modified-Since` headers to reduce bandwidth:

```javascript
GET /swaps/123
If-Modified-Since: Wed, 21 Oct 2023 07:28:00 GMT
```

## Testing Support

### Testnet Integration

```yaml
servers:
  - url: https://testnet-api.thunderportal.io/v1
    description: Testnet server
```

### Simulation Endpoints

```javascript
POST /test/simulate-claim
{
  "swapId": "123",
  "preimage": "abc..."
}
```

Allows testing claim logic without broadcasting.

## Future Extensibility

The API is designed for future enhancements:

### 1. Additional Assets

```yaml
fromAsset:
  enum: [BTC, ETH, USDC, USDT, DAI, DOGE, LTC]
```

Easy to add new assets without breaking changes.

### 2. Advanced HTLC Types

- Partial claims
- Multi-party swaps
- Conditional execution

### 3. Layer 2 Support

- Lightning Network integration
- Liquid sidechain support

## Implementation Checklist

1. **Core Endpoints**
   - [ ] Quote generation with real-time pricing
   - [ ] Swap creation with HTLC generation
   - [ ] Status monitoring and updates
   - [ ] Claim/refund transaction handling

2. **Security**
   - [ ] API key management
   - [ ] HMAC webhook signatures
   - [ ] Rate limiting
   - [ ] Input validation

3. **Bitcoin Integration**
   - [ ] HTLC script generation
   - [ ] Transaction building
   - [ ] Block monitoring
   - [ ] Fee estimation

4. **Resolver Support**
   - [ ] Webhook delivery
   - [ ] Status transitions
   - [ ] Error recovery
   - [ ] Testing tools

## Conclusion

This API design provides a clean, secure, and efficient interface for Bitcoin atomic swaps that integrates seamlessly with 1inch Fusion+. The separation of concerns between the resolver and Bitcoin operations allows for flexible deployment while maintaining atomic guarantees.