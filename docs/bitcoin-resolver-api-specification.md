# Bitcoin Resolver API Specification

## Overview

This document outlines the Bitcoin API service that Thunder Portal resolvers will use to coordinate atomic swaps between 1inch Fusion+ (Ethereum) and Bitcoin. The API follows patterns similar to 1inch resolver interfaces while adapting to Bitcoin's requirements.

## Architecture

```
1inch Fusion+ <-> Thunder Portal Resolver <-> Bitcoin API Service
     (ETH)         (Coordination Layer)          (Your Part)
```

## Core API Endpoints

### 1. Order Management

#### POST /api/v1/orders/create
Create a new Bitcoin-side order matching a Fusion+ order
```javascript
// Request
{
  "orderId": "fusion_order_123",          // Fusion+ order ID
  "paymentHash": "0xabc...",              // Shared hash with Fusion+
  "amount": 100000,                       // Satoshis
  "userBtcAddress": "bc1q...",            // User's BTC destination
  "timeoutBlocks": 144,                   // ~24 hours
  "expectedEthAmount": "1.0"              // For record keeping
}

// Response
{
  "btcOrderId": "btc_order_456",
  "htlcAddress": "3abc...",               // P2SH address for HTLC
  "scriptHex": "0x...",                   // HTLC script
  "timeoutBlockHeight": 820000,
  "status": "waiting_for_funding"
}
```

#### GET /api/v1/orders/{orderId}
Get order status and details
```javascript
// Response
{
  "btcOrderId": "btc_order_456",
  "fusionOrderId": "fusion_order_123",
  "status": "funded",  // waiting_for_funding, funded, claimed, refunded, expired
  "htlcAddress": "3abc...",
  "fundingTxId": "tx123...",
  "fundingAmount": 100000,
  "currentBlockHeight": 819500,
  "timeoutBlockHeight": 820000
}
```

### 2. HTLC Operations

#### POST /api/v1/htlc/fund
Fund the HTLC (resolver deposits BTC)
```javascript
// Request
{
  "orderId": "btc_order_456",
  "txId": "funding_tx_123"      // Optional: if already broadcast
}

// Response  
{
  "success": true,
  "txId": "funding_tx_123",
  "htlcAddress": "3abc...",
  "amount": 100000,
  "confirmations": 0,
  "status": "mempool"
}
```

#### POST /api/v1/htlc/claim
Claim HTLC with preimage (for user)
```javascript
// Request
{
  "orderId": "btc_order_456",
  "preimage": "0x123...",              // 32-byte preimage
  "userSignature": "0x...",            // User's signature
  "claimAddress": "bc1q..."            // Where to send BTC
}

// Response
{
  "success": true,
  "claimTxId": "claim_tx_789",
  "amount": 99500,                     // After fees
  "status": "broadcast"
}
```

#### POST /api/v1/htlc/refund
Refund HTLC after timeout (for resolver)
```javascript
// Request
{
  "orderId": "btc_order_456",
  "resolverSignature": "0x..."         // Resolver's signature
}

// Response
{
  "success": true,
  "refundTxId": "refund_tx_999",
  "amount": 99500,
  "status": "broadcast"
}
```

### 3. Monitoring & Webhooks

#### GET /api/v1/monitoring/status
Health check and system status
```javascript
// Response
{
  "status": "healthy",
  "bitcoinNode": {
    "connected": true,
    "blockHeight": 819500,
    "network": "mainnet"
  },
  "pendingOrders": 5,
  "resolverBalance": 2.5  // BTC
}
```

#### POST /api/v1/webhooks/register
Register webhook for order updates
```javascript
// Request
{
  "url": "https://resolver.example.com/webhook",
  "events": ["order.funded", "order.claimed", "order.refunded"],
  "secret": "webhook_secret_123"
}

// Response
{
  "webhookId": "webhook_789",
  "status": "active"
}
```

### 4. Bitcoin Network Operations

#### GET /api/v1/bitcoin/fee-estimate
Get current fee estimates
```javascript
// Response
{
  "fastestFee": 50,      // sat/vB
  "halfHourFee": 30,
  "hourFee": 20,
  "economyFee": 10
}
```

#### GET /api/v1/bitcoin/utxos
Get resolver's available UTXOs
```javascript
// Response
{
  "utxos": [
    {
      "txid": "abc...",
      "vout": 0,
      "amount": 500000,
      "confirmations": 10
    }
  ],
  "total": 500000
}
```

## Webhook Events

Your API should emit these events:

```javascript
// Order Funded
{
  "event": "order.funded",
  "orderId": "btc_order_456",
  "txId": "funding_tx_123",
  "confirmations": 1,
  "timestamp": 1234567890
}

// Order Claimed
{
  "event": "order.claimed",
  "orderId": "btc_order_456",
  "preimage": "0x123...",
  "claimTxId": "claim_tx_789",
  "timestamp": 1234567890
}

// Order Timeout Approaching
{
  "event": "order.timeout_warning",
  "orderId": "btc_order_456",
  "blocksUntilTimeout": 10,
  "currentHeight": 819990,
  "timeoutHeight": 820000
}
```

## Security Requirements

1. **API Authentication**
   - Use API keys for resolver authentication
   - Implement rate limiting
   - Log all operations

2. **HTLC Security**
   - Validate all signatures
   - Check timelock constraints
   - Verify preimage hashes

3. **Network Security**
   - Use HTTPS only
   - Implement request signing
   - Validate webhook signatures

## Implementation Notes

### Required Libraries
```javascript
// package.json
{
  "dependencies": {
    "bitcoinjs-lib": "^6.1.5",
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "@bitcoin-js/tiny-secp256k1-asmjs": "^2.2.3"
  }
}
```

### HTLC Script Template
```javascript
const bitcoin = require('bitcoinjs-lib');

function createHTLC(paymentHash, userPubKey, resolverPubKey, timeoutBlocks) {
  return bitcoin.script.compile([
    bitcoin.opcodes.OP_HASH160,
    paymentHash,
    bitcoin.opcodes.OP_EQUAL,
    bitcoin.opcodes.OP_IF,
      userPubKey,
    bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(timeoutBlocks),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      resolverPubKey,
    bitcoin.opcodes.OP_ENDIF,
    bitcoin.opcodes.OP_CHECKSIG
  ]);
}
```

## Testing Endpoints

### POST /api/v1/test/fund-faucet
Get testnet BTC for testing
```javascript
// Request
{
  "address": "tb1q...",
  "amount": 100000  // satoshis
}
```

### POST /api/v1/test/simulate-claim
Simulate a claim without broadcasting
```javascript
// Request
{
  "orderId": "btc_order_456",
  "preimage": "0x123..."
}

// Response
{
  "valid": true,
  "estimatedFee": 2500,
  "netAmount": 97500
}
```

## Error Responses

All errors follow this format:
```javascript
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Resolver has insufficient BTC balance",
    "details": {
      "required": 100000,
      "available": 50000
    }
  }
}
```

Common error codes:
- `INVALID_PREIMAGE`
- `TIMEOUT_EXPIRED`
- `INSUFFICIENT_BALANCE`
- `INVALID_SIGNATURE`
- `ORDER_NOT_FOUND`
- `ALREADY_CLAIMED`

## Integration Example

```javascript
// Resolver using your Bitcoin API
class ThunderResolver {
  async handleFusionOrder(fusionOrder) {
    // 1. Create matching Bitcoin order
    const btcOrder = await this.btcApi.createOrder({
      orderId: fusionOrder.id,
      paymentHash: fusionOrder.secretHash,
      amount: this.calculateBtcAmount(fusionOrder),
      userBtcAddress: fusionOrder.metadata.btcAddress,
      timeoutBlocks: 144
    });

    // 2. Fund the HTLC
    await this.btcApi.fundHTLC({
      orderId: btcOrder.btcOrderId
    });

    // 3. Fill Fusion+ order
    await this.fusionSDK.fillOrder(fusionOrder);

    // 4. Monitor for preimage reveal
    this.monitorForClaim(btcOrder.btcOrderId);
  }
}
```

This API specification provides a clean interface between the 1inch Fusion+ resolver logic and Bitcoin HTLC operations, allowing seamless atomic swaps while maintaining security and atomicity.