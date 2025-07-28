# Thunder Portal Backend API Implementation Checklist

## Overview
This checklist ensures our backend API implementation is complete, secure, and ready for the hackathon. Focus is on core atomic swap functionality, not UI.

## ✅ Core API Endpoints

### Orders Management
- [ ] `POST /v1/orders` - Create swap order
  - [ ] Validate direction (ETH_TO_BTC, BTC_TO_ETH)
  - [ ] Validate amounts and tokens
  - [ ] Generate proper order ID (UUID)
  - [ ] Set correct initial status
  - [ ] Validate timeout hierarchy (Bitcoin > 2x Ethereum)
  - [ ] Store in database

- [ ] `GET /v1/orders/{orderId}` - Get order details
  - [ ] Return complete order information
  - [ ] Include current status
  - [ ] Include HTLC details if created
  - [ ] Include transaction IDs if available

- [ ] `POST /v1/orders/{orderId}/fusion-proof` - Submit Fusion+ proof
  - [ ] Verify order exists and status is correct
  - [ ] Validate Fusion+ order data
  - [ ] For ETH→BTC: Create Bitcoin HTLC after verification
  - [ ] For BTC→ETH: Mark ready for Fusion+ filling
  - [ ] Update order status appropriately

### HTLC Operations
- [ ] `POST /v1/htlc/verify` - Verify user-created HTLC
  - [ ] Parse and validate Bitcoin script
  - [ ] Check payment hash matches order
  - [ ] Verify public keys are correct
  - [ ] Validate timeout > Ethereum timeout
  - [ ] Check P2SH address derivation
  - [ ] Store HTLC details if valid

- [ ] `POST /v1/htlc/{htlcId}/claim` - Claim HTLC with preimage
  - [ ] Validate preimage matches hash
  - [ ] Build claim transaction
  - [ ] Broadcast to Bitcoin network
  - [ ] Update HTLC status
  - [ ] Update order status if complete

- [ ] `POST /v1/htlc/{htlcId}/refund` - Refund after timeout
  - [ ] Check current block height > timeout
  - [ ] Build refund transaction
  - [ ] Broadcast to Bitcoin network
  - [ ] Update statuses

### Monitoring & Status
- [ ] `GET /v1/transactions/{txId}/status` - Bitcoin transaction status
  - [ ] Query Bitcoin node for confirmations
  - [ ] Return confirmation count
  - [ ] Return block height if confirmed

- [ ] `POST /v1/webhooks` - Register webhook
  - [ ] Store webhook URL and events
  - [ ] Validate URL format
  - [ ] Generate webhook ID

- [ ] `GET /v1/health` - Service health check
  - [ ] Check Bitcoin node connection
  - [ ] Check Ethereum RPC connection
  - [ ] Check database connection
  - [ ] Return resolver balance info

- [ ] `GET /v1/fees/estimate` - Estimate swap fees
  - [ ] Get current Bitcoin fee rates
  - [ ] Get Ethereum gas prices
  - [ ] Calculate total costs
  - [ ] Return warnings if fees high

## ✅ Bitcoin Integration

### HTLC Script Construction
- [ ] Build P2SH HTLC script with:
  - [ ] OP_IF path for claim with preimage
  - [ ] OP_ELSE path for refund after timeout
  - [ ] Proper OP_SHA256 validation
  - [ ] Correct public key checks
  - [ ] CHECKLOCKTIMEVERIFY for timeout

### Transaction Building
- [ ] HTLC funding transaction
- [ ] HTLC claim transaction with preimage
- [ ] HTLC refund transaction after timeout
- [ ] Proper fee calculation
- [ ] Change address handling

### Bitcoin Monitoring
- [ ] Monitor for HTLC funding confirmations
- [ ] Detect claim transactions (extract preimage)
- [ ] Handle blockchain reorganizations
- [ ] Track timeout approaching

## ✅ Ethereum Integration

### Fusion+ Integration
- [ ] Parse Fusion+ order data
- [ ] Verify EIP-712 signatures
- [ ] Fill Fusion+ orders as resolver
- [ ] Monitor order execution

### Smart Contract Interaction
- [ ] Read Fusion+ order states
- [ ] Execute fills with proper parameters
- [ ] Handle gas estimation
- [ ] Retry failed transactions

## ✅ State Management

### Order Status Progression
- [ ] ETH→BTC flow:
  - [ ] created → awaiting_fusion_proof
  - [ ] awaiting_fusion_proof → fusion_proof_verified
  - [ ] fusion_proof_verified → bitcoin_htlc_created
  - [ ] bitcoin_htlc_created → bitcoin_htlc_funded
  - [ ] bitcoin_htlc_funded → fusion_order_fillable
  - [ ] fusion_order_fillable → fusion_order_filled
  - [ ] fusion_order_filled → preimage_revealed
  - [ ] preimage_revealed → completed

- [ ] BTC→ETH flow:
  - [ ] created → awaiting_bitcoin_htlc
  - [ ] awaiting_bitcoin_htlc → bitcoin_htlc_verified
  - [ ] bitcoin_htlc_verified → bitcoin_htlc_funded_unconfirmed
  - [ ] bitcoin_htlc_funded_unconfirmed → bitcoin_htlc_confirmed
  - [ ] bitcoin_htlc_confirmed → fusion_order_filling
  - [ ] fusion_order_filling → fusion_order_filled
  - [ ] fusion_order_filled → completed

### Database Schema
- [ ] Orders table with all fields
- [ ] HTLCs table with script details
- [ ] Transactions table for monitoring
- [ ] Webhooks table for notifications

## ✅ Security Checklist

### Input Validation
- [ ] Validate all addresses (Bitcoin & Ethereum)
- [ ] Check amounts are within limits
- [ ] Validate timeout parameters
- [ ] Sanitize all string inputs
- [ ] Prevent SQL injection

### Atomic Swap Security
- [ ] Enforce timeout hierarchy
- [ ] Validate preimage length (32 bytes)
- [ ] Check HTLC script structure
- [ ] Prevent double spending
- [ ] Handle edge cases (timeouts, failures)

### API Security
- [ ] API key authentication
- [ ] Rate limiting per key
- [ ] Request size limits
- [ ] CORS configuration
- [ ] Error message sanitization

## ✅ Error Handling

### API Errors
- [ ] 400 Bad Request - Invalid parameters
- [ ] 404 Not Found - Resource doesn't exist
- [ ] 409 Conflict - Invalid state transition
- [ ] 503 Service Unavailable - Dependencies down

### Recovery Mechanisms
- [ ] Automatic retry for network errors
- [ ] Graceful degradation
- [ ] Clear error messages
- [ ] Webhook retry logic

## ✅ Testing Requirements

### Unit Tests
- [ ] HTLC script generation
- [ ] Transaction building
- [ ] State transitions
- [ ] Input validation

### Integration Tests
- [ ] Full ETH→BTC swap flow
- [ ] Full BTC→ETH swap flow
- [ ] Timeout scenarios
- [ ] Error scenarios

### End-to-End Tests
- [ ] Testnet swap execution
- [ ] Multiple concurrent swaps
- [ ] Load testing
- [ ] Failure recovery

## ✅ Demo Preparation

### Test Data
- [ ] Testnet Bitcoin wallet funded
- [ ] Testnet Ethereum wallet funded
- [ ] Pre-created orders for demo
- [ ] Known-good transaction IDs

### Demo Scripts
- [ ] ETH→BTC swap walkthrough
- [ ] BTC→ETH swap walkthrough
- [ ] Status monitoring demonstration
- [ ] Error handling showcase

## ✅ Production Readiness

### Configuration
- [ ] Environment variables documented
- [ ] Secrets management
- [ ] Network selection (mainnet/testnet)
- [ ] Fee configuration

### Monitoring
- [ ] Structured logging
- [ ] Metrics collection
- [ ] Alert configuration
- [ ] Performance tracking

### Documentation
- [ ] API documentation complete
- [ ] Integration guide
- [ ] Troubleshooting guide
- [ ] Architecture diagram

## Priority Order

1. **Critical (Must Have)**
   - All order endpoints
   - HTLC verification
   - Bitcoin monitoring
   - Status tracking

2. **Important (Should Have)**
   - Health endpoint
   - Fee estimation
   - Webhook support
   - Error recovery

3. **Nice to Have**
   - Advanced monitoring
   - Performance optimization
   - Extended documentation

## Success Criteria

- [ ] Both swap directions work end-to-end
- [ ] Atomic guarantees maintained
- [ ] Proper timeout handling
- [ ] Clean API responses
- [ ] Reliable demo execution

Remember: Focus on core functionality first. A working atomic swap is better than a feature-rich but buggy implementation.