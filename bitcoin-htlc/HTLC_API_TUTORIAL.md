# Thunder Portal HTLC API Tutorial

A comprehensive guide to using the Thunder Portal Hash Time Locked Contract (HTLC) as a Service API for trustless atomic swaps between Bitcoin and Ethereum.

## Table of Contents

1. [Introduction](#introduction)
   - [What is an HTLC?](#what-is-an-htlc)
   - [Why Use HTLCs?](#why-use-htlcs)
   - [How Thunder Portal Works](#how-thunder-portal-works)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
   - [Environment Setup](#environment-setup)
   - [API Authentication](#api-authentication)
   - [Network Configuration](#network-configuration)
4. [Core Concepts](#core-concepts)
   - [HTLC Script Structure](#htlc-script-structure)
   - [Swap Directions](#swap-directions)
   - [Order Lifecycle](#order-lifecycle)
5. [Step-by-Step Tutorials](#step-by-step-tutorials)
   - [Tutorial 1: ETH to BTC Swap](#tutorial-1-eth-to-btc-swap)
   - [Tutorial 2: BTC to ETH Swap](#tutorial-2-btc-to-eth-swap)
   - [Tutorial 3: Monitoring Order Status](#tutorial-3-monitoring-order-status)
   - [Tutorial 4: Handling Refunds](#tutorial-4-handling-refunds)
6. [API Reference](#api-reference)
   - [Health Check](#health-check)
   - [Create Order](#create-order)
   - [Get Order](#get-order)
   - [Submit Fusion Proof](#submit-fusion-proof)
   - [Verify HTLC](#verify-htlc)
   - [Claim HTLC](#claim-htlc)
   - [Refund HTLC](#refund-htlc)
   - [Transaction Status](#transaction-status)
   - [Fee Estimation](#fee-estimation)
   - [Webhook Registration](#webhook-registration)
7. [Testing Guide](#testing-guide)
   - [Setting Up Bitcoin Testnet](#setting-up-bitcoin-testnet)
   - [Getting Testnet BTC](#getting-testnet-btc)
   - [Running Integration Tests](#running-integration-tests)
   - [Common Test Scenarios](#common-test-scenarios)
8. [Error Handling](#error-handling)
9. [Security Best Practices](#security-best-practices)
10. [Code Examples](#code-examples)
    - [JavaScript/Node.js](#javascriptnodejs)
    - [Python](#python)
    - [cURL](#curl)
11. [Troubleshooting](#troubleshooting)
12. [Production Deployment](#production-deployment)
13. [Additional Resources](#additional-resources)

---

## Introduction

### What is an HTLC?

A Hash Time Locked Contract (HTLC) is a type of smart contract that enables trustless exchanges between parties using cryptographic proofs. It combines two key mechanisms:

1. **Hashlocks**: Funds can only be claimed by revealing a secret preimage that hashes to a predetermined value
2. **Timelocks**: Funds automatically return to the sender after a timeout period if not claimed

This creates a secure atomic swap where either both parties receive their funds, or the swap is cancelled and funds are refunded.

### Why Use HTLCs?

HTLCs provide several key benefits:

- **Trustless**: No intermediary or escrow service required
- **Atomic**: The swap either completes fully or not at all
- **Cross-chain**: Enable exchanges between different blockchains
- **Secure**: Based on proven cryptographic principles
- **Decentralized**: No central point of failure

### How Thunder Portal Works

Thunder Portal acts as a bridge between Bitcoin and Ethereum networks, facilitating atomic swaps through the 1inch Fusion+ protocol:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User wants    │────▶│  Thunder Portal │────▶│ Creates Bitcoin │
│   ETH → BTC     │     │      API        │     │      HTLC       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
  [Create Fusion+]         [Coordinates]            [Locks BTC]
  [Order on ETH]           [Both Chains]            [With Hash]
         │                       │                        │
         ▼                       ▼                        ▼
  [ETH Locked in]          [Monitors &]             [Preimage]
  [Fusion+ Order]          [Verifies]               [Revealed]
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                               │
                               ▼
                        [Atomic Swap]
                        [Completed!]
```

---

## Prerequisites

Before using the Thunder Portal API, ensure you have:

1. **Development Environment**:
   - Node.js 16+ or Python 3.8+ for client applications
   - Git for version control
   - A code editor (VS Code, Sublime, etc.)

2. **Blockchain Tools**:
   - Bitcoin testnet wallet or library
   - Ethereum wallet with testnet ETH
   - Basic understanding of Bitcoin and Ethereum transactions

3. **API Requirements**:
   - Thunder Portal API endpoint (default: `http://localhost:3000`)
   - API key for authentication
   - Network connectivity to blockchain nodes

4. **Knowledge Requirements**:
   - Basic understanding of REST APIs
   - Familiarity with JSON data format
   - Understanding of public/private key cryptography
   - Basic knowledge of Bitcoin and Ethereum

---

## Getting Started

### Environment Setup

1. **Clone the Repository** (if self-hosting):
```bash
git clone https://github.com/thunder-portal/bitcoin-htlc.git
cd bitcoin-htlc
```

2. **Configure Environment**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Network Configuration
BITCOIN_NETWORK=testnet
BITCOIN_API_URL=https://blockstream.info/testnet/api

# API Security
API_KEY=your-secret-api-key-here

# Resolver Keys (generate your own for production)
RESOLVER_PRIVATE_KEY=your-private-key
RESOLVER_PUBLIC_KEY=your-public-key
```

3. **Start the Service** (if self-hosting):
```bash
cargo build --release
cargo run --release
```

### API Authentication

All API requests (except health check) require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-secret-api-key-here" \
     https://api.thunderportal.io/v1/orders
```

### Network Configuration

Thunder Portal supports both testnet and mainnet:

**Testnet Configuration**:
- Bitcoin Testnet (testnet3)
- Ethereum Sepolia
- Free testnet coins available from faucets
- Ideal for development and testing

**Mainnet Configuration**:
- Bitcoin Mainnet
- Ethereum Mainnet
- Real funds at risk
- Production use only

---

## Core Concepts

### HTLC Script Structure

The Bitcoin HTLC script implements two spending paths:

```
OP_IF
    # Claim path: Reveal preimage
    OP_SHA256 <payment_hash> OP_EQUALVERIFY
    <recipient_pubkey> OP_CHECKSIG
OP_ELSE
    # Refund path: After timeout
    <timeout_height> OP_CHECKLOCKTIMEVERIFY OP_DROP
    <sender_pubkey> OP_CHECKSIG
OP_ENDIF
```

**Key Components**:
- `payment_hash`: SHA256 hash of the secret preimage
- `recipient_pubkey`: Public key of fund recipient
- `sender_pubkey`: Public key of fund sender
- `timeout_height`: Bitcoin block height for refund activation

### Swap Directions

Thunder Portal supports bidirectional swaps:

1. **ETH_TO_BTC**: User provides ETH, receives BTC
   - User creates Fusion+ order on Ethereum
   - Resolver creates Bitcoin HTLC
   - Atomic swap ensures both succeed or fail

2. **BTC_TO_ETH**: User provides BTC, receives ETH
   - User creates Bitcoin HTLC
   - Resolver fills Fusion+ order on Ethereum
   - Same atomic guarantees apply

### Order Lifecycle

Orders progress through multiple states:

```
Created → AwaitingFusionProof → FusionProofVerified → BitcoinHtlcCreated
   ↓                                                           ↓
Failed ← Expired ← ... ← BitcoinHtlcFunded → BitcoinHtlcConfirmed
                                                              ↓
                                                   FusionOrderFillable
                                                              ↓
                                              PreimageRevealed → Completed
```

**State Descriptions**:
- `Created`: Initial order created
- `AwaitingFusionProof`: Waiting for Ethereum-side proof
- `BitcoinHtlcCreated`: HTLC deployed on Bitcoin
- `BitcoinHtlcFunded`: HTLC received funds
- `BitcoinHtlcConfirmed`: Required confirmations reached
- `PreimageRevealed`: Secret revealed, claiming possible
- `Completed`: Swap successfully completed
- `Expired`: Timeout reached, refund available
- `Failed`: Error occurred during process

---

## Step-by-Step Tutorials

### Tutorial 1: ETH to BTC Swap

This tutorial walks through swapping ETH for BTC using Thunder Portal.

#### Step 1: Create an Order

```bash
curl -X POST https://api.thunderportal.io/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "100000",
    "fromToken": {
      "symbol": "ETH",
      "address": "0x0000000000000000000000000000000000000000"
    },
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "preimageHash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517",
    "timeouts": {
      "ethereumBlocks": 300,
      "bitcoinBlocks": 144
    }
  }'
```

**Response**:
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "direction": "ETH_TO_BTC",
  "status": "created",
  "expected_steps": [
    "Create Fusion+ order on Ethereum",
    "Submit Fusion+ proof to Thunder Portal",
    "Wait for Bitcoin HTLC creation",
    "Monitor for preimage revelation",
    "Claim Bitcoin funds"
  ],
  "expires_at": "2024-01-29T10:30:00Z",
  "eth_to_btc_instructions": {
    "fusion_order_requirements": {
      "resolver_address": "0x1234567890123456789012345678901234567890",
      "preimage_hash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517",
      "token_amount": "1000000000000000",
      "deadline": "1706525400"
    }
  }
}
```

#### Step 2: Create Fusion+ Order on Ethereum

Using the requirements from the response, create a Fusion+ order on Ethereum. This is done through the 1inch Fusion+ interface or SDK.

#### Step 3: Submit Fusion+ Proof

Once the Fusion+ order is created, submit the proof:

```bash
curl -X POST https://api.thunderportal.io/v1/orders/550e8400-e29b-41d4-a716-446655440000/fusion-proof \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "fusion_order_id": "123456",
    "fusion_order_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "fusion_order_signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  }'
```

**Response**:
```json
{
  "accepted": true,
  "next_step": "Bitcoin HTLC will be created. Monitor order status.",
  "bitcoin_htlc": {
    "htlc_id": "660e8400-e29b-41d4-a716-446655440000",
    "address": "2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc",
    "redeem_script": "63a820427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517882103789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd6704b175655cb17521034252bb0bff4b4b75146e5e2e3c0c5d8d8e2f9e3c9e3d9e2e1e0d9d8d7d6d5d4ac68",
    "funding_amount": 100000
  }
}
```

#### Step 4: Monitor Order Status

```bash
curl https://api.thunderportal.io/v1/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"
```

Wait for status to change to `PreimageRevealed`.

#### Step 5: Claim Bitcoin Funds

Once the preimage is revealed (from Ethereum side):

```bash
curl -X POST https://api.thunderportal.io/v1/htlc/660e8400-e29b-41d4-a716-446655440000/claim \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "preimage": "68656c6c6f20776f726c642074686973206973206120707265696d616765212121"
  }'
```

**Response**:
```json
{
  "transaction_id": "3b5f7e3d8a4c9b2e1f6d5a4c3b2a1e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d",
  "status": "broadcast",
  "claim_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
  "claimed_amount": 99000
}
```

### Tutorial 2: BTC to ETH Swap

This tutorial covers swapping BTC for ETH.

#### Step 1: Create an Order

```bash
curl -X POST https://api.thunderportal.io/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "direction": "BTC_TO_ETH",
    "amount": "50000",
    "toToken": {
      "symbol": "USDC",
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    },
    "ethereumAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD7e",
    "preimageHash": "8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c",
    "resolverPublicKey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
  }'
```

**Response**:
```json
{
  "order_id": "770e8400-e29b-41d4-a716-446655440000",
  "direction": "BTC_TO_ETH",
  "status": "created",
  "btc_to_eth_instructions": {
    "htlc_requirements": {
      "user_public_key": "03your_public_key_here",
      "resolver_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
      "payment_hash": "8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c",
      "amount": "50000",
      "timeout_height": 750000,
      "script_template": "OP_IF OP_SHA256 <payment_hash> OP_EQUALVERIFY <resolver_pubkey> OP_CHECKSIG OP_ELSE <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP <user_pubkey> OP_CHECKSIG OP_ENDIF"
    }
  }
}
```

#### Step 2: Create Bitcoin HTLC

Using Bitcoin libraries, create an HTLC with the provided requirements and fund it.

#### Step 3: Verify HTLC Creation

```bash
curl -X POST https://api.thunderportal.io/v1/htlc/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "transaction_hex": "0200000001...",
    "output_index": 0,
    "expected_amount": 50000,
    "expected_payment_hash": "8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c6b5a4e3d2c1b0a9e8d7c",
    "expected_recipient_pubkey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "expected_sender_pubkey": "03your_public_key_here"
  }'
```

**Response**:
```json
{
  "valid": true,
  "htlc_address": "2N5YqSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc",
  "actual_amount": 50000,
  "timeout_height": 750000,
  "validation_errors": []
}
```

#### Step 4: Monitor and Complete

The resolver will fill the Fusion+ order on Ethereum. Once complete, they'll claim the Bitcoin HTLC using the preimage, which you can then use to claim your ETH/tokens.

### Tutorial 3: Monitoring Order Status

#### Using Polling

```javascript
// JavaScript example
const API_KEY = 'your-api-key';
const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function monitorOrder(orderId) {
  while (true) {
    const response = await fetch(
      `https://api.thunderportal.io/v1/orders/${orderId}`,
      {
        headers: { 'X-API-Key': API_KEY }
      }
    );
    
    const order = await response.json();
    console.log(`Order status: ${order.status}`);
    
    if (['completed', 'failed', 'expired'].includes(order.status)) {
      console.log('Order finished:', order);
      break;
    }
    
    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

monitorOrder(ORDER_ID);
```

#### Using Webhooks

Register a webhook to receive real-time updates:

```bash
curl -X POST https://api.thunderportal.io/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "url": "https://your-server.com/webhooks/thunder-portal",
    "events": [
      "order.created",
      "order.bitcoin_htlc_created",
      "order.bitcoin_htlc_funded",
      "order.preimage_revealed",
      "order.completed",
      "order.failed"
    ],
    "secret": "your-webhook-secret-key-minimum-32-characters-long"
  }'
```

### Tutorial 4: Handling Refunds

If a swap times out, funds can be refunded.

#### Check Refund Eligibility

```bash
curl https://api.thunderportal.io/v1/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"
```

Look for `status: "expired"` and check the current block height.

#### Execute Refund

```bash
curl -X POST https://api.thunderportal.io/v1/htlc/660e8400-e29b-41d4-a716-446655440000/refund \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{}'
```

**Response**:
```json
{
  "transaction_id": "4c6f8e4d9b3a2c1e0f9d8c7b6a5e4d3c2b1a0e9d8c7b6a5e4d3c2b1a0e9d8c7b",
  "status": "broadcast",
  "refund_address": "tb1qoriginal_sender_address",
  "refunded_amount": 99000
}
```

---

## API Reference

### Health Check

**Endpoint**: `GET /v1/health`

**Description**: Check service health and dependencies

**Headers**: None required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-29T10:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "bitcoin_node": {
      "connected": true,
      "block_height": 2500000,
      "network": "testnet",
      "latency": 10
    },
    "ethereum_rpc": {
      "connected": true,
      "chain_id": 11155111,
      "block_number": 4500000,
      "latency": 15
    },
    "database": {
      "connected": true,
      "latency": 2
    },
    "fusion_api": {
      "connected": true,
      "latency": 20
    }
  },
  "resolver": {
    "bitcoin_balance": "50000000",
    "ethereum_balance": "5000000000000000000",
    "active_orders": 3
  }
}
```

### Create Order

**Endpoint**: `POST /v1/orders`

**Description**: Create a new swap order

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{
  "direction": "ETH_TO_BTC",
  "amount": "100000",
  "fromToken": {
    "symbol": "ETH",
    "address": "0x0000000000000000000000000000000000000000"
  },
  "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
  "bitcoinPublicKey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
  "preimageHash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517",
  "resolverPublicKey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
  "confirmationRequirements": {
    "bitcoin": 3,
    "ethereum": 12
  },
  "timeouts": {
    "ethereumBlocks": 300,
    "bitcoinBlocks": 144
  }
}
```

**Parameters**:
- `direction`: Swap direction ("ETH_TO_BTC" or "BTC_TO_ETH")
- `amount`: Amount in satoshis (for BTC) or smallest unit
- `fromToken/toToken`: Token information for ETH side
- `bitcoinAddress`: Recipient Bitcoin address
- `bitcoinPublicKey`: Recipient Bitcoin public key (hex)
- `ethereumAddress`: Recipient Ethereum address
- `preimageHash`: SHA256 hash of secret (64 hex chars)
- `resolverPublicKey`: Optional custom resolver
- `confirmationRequirements`: Block confirmations needed
- `timeouts`: Timeout periods in blocks

**Response**: See Tutorial 1 for example

### Get Order

**Endpoint**: `GET /v1/orders/{order_id}`

**Description**: Retrieve order details and current status

**Headers**:
- `X-API-Key: your-api-key`

**Response**:
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "direction": "ETH_TO_BTC",
  "status": "bitcoin_htlc_funded",
  "amounts": {
    "bitcoin_amount": 100000,
    "ethereum_amount": "1000000000000000"
  },
  "addresses": {
    "bitcoin_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "ethereum_address": null
  },
  "htlc_details": {
    "htlc_id": "660e8400-e29b-41d4-a716-446655440000",
    "address": "2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc",
    "redeem_script": "63a820...",
    "funding_tx": "3b5f7e3d8a4c9b2e1f6d5a4c3b2a1e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d",
    "claim_tx": null,
    "refund_tx": null
  },
  "fusion_order": {
    "order_id": "123456",
    "order_hash": "0x1234...",
    "status": "fillable"
  },
  "timestamps": {
    "created_at": "2024-01-29T10:00:00Z",
    "updated_at": "2024-01-29T10:05:00Z",
    "expires_at": "2024-01-29T11:00:00Z"
  },
  "confirmations": {
    "bitcoin_required": 3,
    "bitcoin_current": 1,
    "ethereum_required": 12,
    "ethereum_current": 0
  }
}
```

### Submit Fusion Proof

**Endpoint**: `POST /v1/orders/{order_id}/fusion-proof`

**Description**: Submit proof of Fusion+ order creation

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{
  "fusion_order_id": "123456",
  "fusion_order_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "fusion_order_signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
  "fusion_order_data": {
    "maker": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD7e",
    "resolver": "0x1234567890123456789012345678901234567890",
    "src_token": "0x0000000000000000000000000000000000000000",
    "dst_token": "0x0000000000000000000000000000000000000000",
    "src_amount": "1000000000000000",
    "dst_amount": "100000",
    "deadline": "1706525400"
  }
}
```

### Verify HTLC

**Endpoint**: `POST /v1/htlc/verify`

**Description**: Verify a Bitcoin HTLC matches expected parameters

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{
  "transaction_hex": "0200000001...",
  "output_index": 0,
  "expected_amount": 100000,
  "expected_payment_hash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517",
  "expected_recipient_pubkey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
  "expected_sender_pubkey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
}
```

**Response**:
```json
{
  "valid": true,
  "htlc_address": "2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc",
  "actual_amount": 100000,
  "timeout_height": 750000,
  "validation_errors": []
}
```

### Claim HTLC

**Endpoint**: `POST /v1/htlc/{htlc_id}/claim`

**Description**: Claim HTLC funds by revealing preimage

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{
  "preimage": "68656c6c6f20776f726c642074686973206973206120707265696d616765212121",
  "bitcoin_tx_hex": "optional_custom_transaction_hex"
}
```

**Response**:
```json
{
  "transaction_id": "3b5f7e3d8a4c9b2e1f6d5a4c3b2a1e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d",
  "status": "broadcast",
  "claim_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
  "claimed_amount": 99000
}
```

### Refund HTLC

**Endpoint**: `POST /v1/htlc/{htlc_id}/refund`

**Description**: Refund HTLC after timeout

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{}
```

**Response**:
```json
{
  "transaction_id": "4c6f8e4d9b3a2c1e0f9d8c7b6a5e4d3c2b1a0e9d8c7b6a5e4d3c2b1a0e9d8c7b",
  "status": "broadcast",
  "refund_address": "tb1qoriginal_sender_address",
  "refunded_amount": 99000
}
```

### Transaction Status

**Endpoint**: `GET /v1/transactions/{tx_id}/status`

**Description**: Get Bitcoin transaction status

**Headers**:
- `X-API-Key: your-api-key`

**Response**:
```json
{
  "transaction_id": "3b5f7e3d8a4c9b2e1f6d5a4c3b2a1e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d",
  "status": "confirmed",
  "confirmations": 3,
  "block_height": 2500123,
  "block_hash": "00000000000000000007878787878787878787878787878787878787878787878",
  "fee": 1000,
  "size": 250,
  "vsize": 175
}
```

### Fee Estimation

**Endpoint**: `GET /v1/fees/estimate`

**Description**: Estimate fees for a swap

**Headers**:
- `X-API-Key: your-api-key`

**Query Parameters**:
- `direction`: "ETH_TO_BTC" or "BTC_TO_ETH"
- `amount`: Amount to swap
- `fromToken`: Source token address (ETH_TO_BTC)
- `toToken`: Destination token address (BTC_TO_ETH)
- `urgent`: Boolean for priority fees

**Example**:
```bash
curl "https://api.thunderportal.io/v1/fees/estimate?direction=ETH_TO_BTC&amount=100000&urgent=false" \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "direction": "ETH_TO_BTC",
  "amount": "100000",
  "bitcoin_network_fee": {
    "satoshis": "500",
    "satoshis_per_vbyte": 2,
    "estimated_vsize": 250
  },
  "ethereum_gas_fee": {
    "wei": "3000000000000000",
    "gas_price": "20000000000",
    "gas_limit": 150000
  },
  "resolver_fee": {
    "amount": "500",
    "percentage": 0.5
  },
  "total_fee": {
    "input_currency": "3000000000000000",
    "output_currency": "1000",
    "percentage": 1.2
  },
  "estimated_time": {
    "bitcoin_confirmations": 3,
    "ethereum_confirmations": 12,
    "total_minutes": 45
  },
  "warnings": [],
  "minimum_amount": "50000",
  "maximum_amount": "10000000000"
}
```

### Webhook Registration

**Endpoint**: `POST /v1/webhooks`

**Description**: Register webhook for order updates

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body**:
```json
{
  "url": "https://your-server.com/webhooks/thunder-portal",
  "events": [
    "order.created",
    "order.bitcoin_htlc_funded",
    "order.completed"
  ],
  "secret": "your-webhook-secret-minimum-32-characters-long"
}
```

**Response**:
```json
{
  "webhook_id": "880e8400-e29b-41d4-a716-446655440000",
  "url": "https://your-server.com/webhooks/thunder-portal",
  "events": [
    "order.created",
    "order.bitcoin_htlc_funded",
    "order.completed"
  ],
  "secret": "your-webhook-secret-minimum-32-characters-long"
}
```

**Webhook Payload Example**:
```json
{
  "event": "order.bitcoin_htlc_funded",
  "timestamp": "2024-01-29T10:15:00Z",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "htlc_address": "2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc",
    "funding_tx": "3b5f7e3d8a4c9b2e1f6d5a4c3b2a1e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4e3d",
    "amount": 100000,
    "confirmations": 0
  }
}
```

---

## Testing Guide

### Setting Up Bitcoin Testnet

#### Option 1: Using Public APIs

No setup required! Thunder Portal uses public testnet APIs by default:
- Blockstream API: `https://blockstream.info/testnet/api`
- BlockCypher API: `https://api.blockcypher.com/v1/btc/test3`

#### Option 2: Running Bitcoin Core

1. **Download Bitcoin Core**:
   ```bash
   wget https://bitcoin.org/bin/bitcoin-core-25.0/bitcoin-25.0-x86_64-linux-gnu.tar.gz
   tar xzf bitcoin-25.0-x86_64-linux-gnu.tar.gz
   ```

2. **Configure for Testnet**:
   ```bash
   mkdir ~/.bitcoin
   echo "testnet=1" > ~/.bitcoin/bitcoin.conf
   echo "server=1" >> ~/.bitcoin/bitcoin.conf
   echo "rpcuser=myuser" >> ~/.bitcoin/bitcoin.conf
   echo "rpcpassword=mypassword" >> ~/.bitcoin/bitcoin.conf
   ```

3. **Start Bitcoin Core**:
   ```bash
   ./bitcoin-25.0/bin/bitcoind -daemon
   ```

4. **Wait for Sync**:
   ```bash
   ./bitcoin-25.0/bin/bitcoin-cli -testnet getblockchaininfo
   ```

### Getting Testnet BTC

#### Recommended Faucets

1. **Bitcoin Testnet Faucet** (https://bitcoinfaucet.uo1.net/)
   - Amount: 0.001 BTC per request
   - Limit: Once per 12 hours
   - No registration required
   
2. **Testnet Faucet** (https://testnet-faucet.com/btc-testnet/)
   - Amount: 0.01 BTC per request
   - Limit: Once per day
   - Email verification required

3. **Coinfaucet** (https://coinfaucet.eu/en/btc-testnet/)
   - Amount: 0.0001-0.001 BTC
   - Limit: Once per hour
   - Captcha required

#### Using a Faucet

1. **Generate a Testnet Address**:
   ```javascript
   // Using bitcoinjs-lib
   const bitcoin = require('bitcoinjs-lib');
   const { ECPairFactory } = require('ecpair');
   const ecc = require('tiny-secp256k1');
   
   const ECPair = ECPairFactory(ecc);
   const network = bitcoin.networks.testnet;
   
   const keyPair = ECPair.makeRandom({ network });
   const { address } = bitcoin.payments.p2wpkh({ 
     pubkey: keyPair.publicKey, 
     network 
   });
   
   console.log('Address:', address);
   console.log('Private Key:', keyPair.toWIF());
   ```

2. **Request from Faucet**:
   - Visit faucet website
   - Enter your testnet address
   - Complete captcha/verification
   - Submit request

3. **Verify Receipt**:
   ```bash
   curl https://blockstream.info/testnet/api/address/YOUR_ADDRESS/utxo
   ```

### Running Integration Tests

#### Test Setup

1. **Clone Test Repository**:
   ```bash
   git clone https://github.com/thunder-portal/integration-tests.git
   cd integration-tests
   npm install
   ```

2. **Configure Test Environment**:
   ```bash
   cp .env.test.example .env.test
   ```

   Edit `.env.test`:
   ```bash
   API_URL=http://localhost:3000
   API_KEY=test-api-key
   BITCOIN_PRIVATE_KEY=your_testnet_private_key
   ETHEREUM_PRIVATE_KEY=your_sepolia_private_key
   ```

3. **Run Tests**:
   ```bash
   npm test
   ```

#### Writing Custom Tests

```javascript
// test/htlc-swap.test.js
const { ThunderPortalClient } = require('../src/client');
const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto');

describe('HTLC Swap Tests', () => {
  let client;
  let preimage;
  let preimageHash;
  
  beforeAll(() => {
    client = new ThunderPortalClient({
      apiUrl: process.env.API_URL,
      apiKey: process.env.API_KEY
    });
    
    // Generate preimage and hash
    preimage = crypto.randomBytes(32);
    preimageHash = crypto.createHash('sha256')
      .update(preimage)
      .digest('hex');
  });
  
  test('Create ETH to BTC order', async () => {
    const order = await client.createOrder({
      direction: 'ETH_TO_BTC',
      amount: '100000',
      bitcoinAddress: 'tb1qtest...',
      bitcoinPublicKey: '03test...',
      preimageHash: preimageHash
    });
    
    expect(order.status).toBe('created');
    expect(order.order_id).toBeTruthy();
  });
  
  test('Verify HTLC creation', async () => {
    // Create and broadcast HTLC transaction
    const htlcTx = createHTLCTransaction({
      amount: 100000,
      paymentHash: preimageHash,
      recipientPubkey: '03test...',
      senderPubkey: '02test...',
      timeout: 750000
    });
    
    const verification = await client.verifyHTLC({
      transaction_hex: htlcTx.toHex(),
      output_index: 0,
      expected_amount: 100000,
      expected_payment_hash: preimageHash,
      expected_recipient_pubkey: '03test...',
      expected_sender_pubkey: '02test...'
    });
    
    expect(verification.valid).toBe(true);
  });
});
```

### Common Test Scenarios

#### 1. Happy Path Test
```javascript
test('Complete ETH to BTC swap', async () => {
  // 1. Create order
  const order = await createOrder();
  
  // 2. Submit Fusion proof
  await submitFusionProof(order.order_id);
  
  // 3. Wait for HTLC creation
  await waitForStatus(order.order_id, 'bitcoin_htlc_created');
  
  // 4. Fund HTLC
  await fundHTLC(order.htlc_address, order.amount);
  
  // 5. Wait for confirmations
  await waitForStatus(order.order_id, 'bitcoin_htlc_confirmed');
  
  // 6. Reveal preimage and claim
  const claim = await claimHTLC(order.htlc_id, preimage);
  
  expect(claim.status).toBe('broadcast');
});
```

#### 2. Timeout and Refund Test
```javascript
test('Refund after timeout', async () => {
  // Create order with short timeout
  const order = await createOrder({
    timeouts: { bitcoinBlocks: 6 }
  });
  
  // Wait for timeout
  await waitForBlocks(6);
  
  // Execute refund
  const refund = await refundHTLC(order.htlc_id);
  
  expect(refund.status).toBe('broadcast');
});
```

#### 3. Invalid HTLC Test
```javascript
test('Reject invalid HTLC', async () => {
  const verification = await client.verifyHTLC({
    transaction_hex: invalidTx,
    output_index: 0,
    expected_amount: 100000,
    expected_payment_hash: wrongHash,
    expected_recipient_pubkey: wrongPubkey,
    expected_sender_pubkey: wrongPubkey
  });
  
  expect(verification.valid).toBe(false);
  expect(verification.validation_errors).toContain('Payment hash mismatch');
});
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "additional_context"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request or missing parameters |
| `INVALID_AMOUNT` | 400 | Amount outside allowed range |
| `INVALID_ADDRESS` | 400 | Invalid Bitcoin or Ethereum address |
| `INVALID_PUBKEY` | 400 | Invalid public key format |
| `INVALID_HASH` | 400 | Invalid hash format or length |
| `ORDER_NOT_FOUND` | 404 | Order ID doesn't exist |
| `HTLC_NOT_FOUND` | 404 | HTLC ID doesn't exist |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Action not allowed in current state |
| `HTLC_NOT_EXPIRED` | 400 | Refund attempted before timeout |
| `INVALID_PREIMAGE` | 400 | Preimage doesn't match hash |
| `INSUFFICIENT_BALANCE` | 400 | Resolver has insufficient funds |
| `NETWORK_ERROR` | 503 | Bitcoin/Ethereum network unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Handling Examples

#### JavaScript
```javascript
try {
  const order = await client.createOrder(orderData);
} catch (error) {
  if (error.code === 'INVALID_AMOUNT') {
    console.error('Amount too small or too large');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Bitcoin network unavailable, retry later');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

#### Python
```python
try:
    order = client.create_order(order_data)
except ThunderPortalError as e:
    if e.code == 'INVALID_AMOUNT':
        print('Amount too small or too large')
    elif e.code == 'NETWORK_ERROR':
        print('Bitcoin network unavailable, retry later')
    else:
        print(f'Unexpected error: {e.message}')
```

### Retry Strategy

For transient errors, implement exponential backoff:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'NETWORK_ERROR' && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Usage
const order = await retryWithBackoff(() => 
  client.createOrder(orderData)
);
```

---

## Security Best Practices

### 1. API Key Management

- **Never commit API keys** to version control
- **Use environment variables** for configuration
- **Rotate keys regularly** (monthly recommended)
- **Use different keys** for development/staging/production
- **Implement IP whitelisting** when possible

### 2. Preimage Security

- **Generate cryptographically secure** preimages:
  ```javascript
  const crypto = require('crypto');
  const preimage = crypto.randomBytes(32);
  ```
- **Never reuse** preimages across swaps
- **Store securely** until swap completion
- **Delete after use** to prevent accidental reuse

### 3. Transaction Verification

- **Always verify** HTLC parameters before funding
- **Check timeout values** ensure adequate time
- **Verify amounts** match expected values
- **Confirm addresses** are correct format and network

### 4. Network Security

- **Use HTTPS** for all API communications
- **Verify SSL certificates** in production
- **Implement request signing** for webhooks:
  ```javascript
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  ```

### 5. Error Handling

- **Don't expose** internal errors to users
- **Log security events** for monitoring
- **Implement rate limiting** to prevent abuse
- **Monitor for** unusual patterns

### 6. Private Key Management

- **Use hardware wallets** for production
- **Implement key derivation** (HD wallets)
- **Never log** private keys
- **Use secure key storage** (HSM, KMS)

### 7. Timeout Configuration

- **Bitcoin timeout** must be > Ethereum timeout
- **Add buffer time** for network delays
- **Monitor block times** for both networks
- **Example safe configuration**:
  ```json
  {
    "timeouts": {
      "ethereumBlocks": 300,  // ~1 hour
      "bitcoinBlocks": 288    // ~48 hours
    }
  }
  ```

---

## Code Examples

### JavaScript/Node.js

#### Complete Integration Example

```javascript
// thunder-portal-client.js
const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto');

class ThunderPortalClient {
  constructor(config) {
    this.apiUrl = config.apiUrl || 'https://api.thunderportal.io';
    this.apiKey = config.apiKey;
    this.network = config.network || bitcoin.networks.testnet;
  }

  async createOrder(orderData) {
    const response = await axios.post(
      `${this.apiUrl}/v1/orders`,
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      }
    );
    return response.data;
  }

  async getOrder(orderId) {
    const response = await axios.get(
      `${this.apiUrl}/v1/orders/${orderId}`,
      {
        headers: { 'X-API-Key': this.apiKey }
      }
    );
    return response.data;
  }

  async submitFusionProof(orderId, proofData) {
    const response = await axios.post(
      `${this.apiUrl}/v1/orders/${orderId}/fusion-proof`,
      proofData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      }
    );
    return response.data;
  }

  async verifyHTLC(verificationData) {
    const response = await axios.post(
      `${this.apiUrl}/v1/htlc/verify`,
      verificationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      }
    );
    return response.data;
  }

  async claimHTLC(htlcId, preimage) {
    const response = await axios.post(
      `${this.apiUrl}/v1/htlc/${htlcId}/claim`,
      { preimage },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      }
    );
    return response.data;
  }

  async estimateFees(params) {
    const response = await axios.get(
      `${this.apiUrl}/v1/fees/estimate`,
      {
        params,
        headers: { 'X-API-Key': this.apiKey }
      }
    );
    return response.data;
  }

  generatePreimage() {
    const preimage = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256')
      .update(preimage)
      .digest('hex');
    return {
      preimage: preimage.toString('hex'),
      hash
    };
  }
}

// Usage example
async function performETHToBTCSwap() {
  const client = new ThunderPortalClient({
    apiUrl: 'http://localhost:3000',
    apiKey: 'your-api-key'
  });

  try {
    // 1. Generate preimage
    const { preimage, hash } = client.generatePreimage();
    console.log('Generated preimage hash:', hash);

    // 2. Estimate fees
    const fees = await client.estimateFees({
      direction: 'ETH_TO_BTC',
      amount: '100000',
      urgent: false
    });
    console.log('Estimated fees:', fees);

    // 3. Create order
    const order = await client.createOrder({
      direction: 'ETH_TO_BTC',
      amount: '100000',
      fromToken: {
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000'
      },
      bitcoinAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      bitcoinPublicKey: '03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd',
      preimageHash: hash
    });
    console.log('Order created:', order.order_id);

    // 4. Create Fusion+ order on Ethereum (implementation depends on 1inch SDK)
    // ...

    // 5. Submit Fusion proof
    const proofResponse = await client.submitFusionProof(order.order_id, {
      fusion_order_id: '123456',
      fusion_order_hash: '0x...',
      fusion_order_signature: '0x...'
    });
    console.log('Fusion proof accepted:', proofResponse.accepted);

    // 6. Monitor order status
    let orderStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      orderStatus = await client.getOrder(order.order_id);
      console.log('Order status:', orderStatus.status);
    } while (!['completed', 'failed', 'expired'].includes(orderStatus.status));

    // 7. If preimage revealed, claim funds
    if (orderStatus.status === 'preimage_revealed') {
      const claim = await client.claimHTLC(
        orderStatus.htlc_details.htlc_id,
        preimage
      );
      console.log('Claimed:', claim);
    }

  } catch (error) {
    console.error('Swap failed:', error.response?.data || error.message);
  }
}

// Run the swap
performETHToBTCSwap();
```

### Python

#### Complete Integration Example

```python
# thunder_portal_client.py
import requests
import hashlib
import secrets
import time
from typing import Dict, Tuple, Optional
import json

class ThunderPortalClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })
    
    def create_order(self, order_data: Dict) -> Dict:
        """Create a new swap order"""
        response = self.session.post(
            f"{self.api_url}/v1/orders",
            json=order_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_order(self, order_id: str) -> Dict:
        """Get order details"""
        response = self.session.get(
            f"{self.api_url}/v1/orders/{order_id}"
        )
        response.raise_for_status()
        return response.json()
    
    def submit_fusion_proof(self, order_id: str, proof_data: Dict) -> Dict:
        """Submit Fusion+ proof"""
        response = self.session.post(
            f"{self.api_url}/v1/orders/{order_id}/fusion-proof",
            json=proof_data
        )
        response.raise_for_status()
        return response.json()
    
    def verify_htlc(self, verification_data: Dict) -> Dict:
        """Verify HTLC parameters"""
        response = self.session.post(
            f"{self.api_url}/v1/htlc/verify",
            json=verification_data
        )
        response.raise_for_status()
        return response.json()
    
    def claim_htlc(self, htlc_id: str, preimage: str) -> Dict:
        """Claim HTLC with preimage"""
        response = self.session.post(
            f"{self.api_url}/v1/htlc/{htlc_id}/claim",
            json={"preimage": preimage}
        )
        response.raise_for_status()
        return response.json()
    
    def refund_htlc(self, htlc_id: str) -> Dict:
        """Refund expired HTLC"""
        response = self.session.post(
            f"{self.api_url}/v1/htlc/{htlc_id}/refund",
            json={}
        )
        response.raise_for_status()
        return response.json()
    
    def estimate_fees(self, direction: str, amount: str, urgent: bool = False) -> Dict:
        """Estimate swap fees"""
        params = {
            'direction': direction,
            'amount': amount,
            'urgent': str(urgent).lower()
        }
        response = self.session.get(
            f"{self.api_url}/v1/fees/estimate",
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def register_webhook(self, url: str, events: list, secret: Optional[str] = None) -> Dict:
        """Register webhook for updates"""
        webhook_data = {
            'url': url,
            'events': events
        }
        if secret:
            webhook_data['secret'] = secret
        else:
            webhook_data['secret'] = secrets.token_hex(32)
        
        response = self.session.post(
            f"{self.api_url}/v1/webhooks",
            json=webhook_data
        )
        response.raise_for_status()
        return response.json()
    
    @staticmethod
    def generate_preimage() -> Tuple[str, str]:
        """Generate secure preimage and hash"""
        preimage = secrets.token_bytes(32)
        preimage_hex = preimage.hex()
        hash_hex = hashlib.sha256(preimage).hexdigest()
        return preimage_hex, hash_hex


# Example usage
async def perform_btc_to_eth_swap():
    # Initialize client
    client = ThunderPortalClient(
        api_url='http://localhost:3000',
        api_key='your-api-key'
    )
    
    try:
        # 1. Generate preimage
        preimage, preimage_hash = client.generate_preimage()
        print(f"Generated preimage hash: {preimage_hash}")
        
        # 2. Create order
        order = client.create_order({
            'direction': 'BTC_TO_ETH',
            'amount': '50000',
            'toToken': {
                'symbol': 'USDC',
                'address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
            },
            'ethereumAddress': '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD7e',
            'preimageHash': preimage_hash
        })
        print(f"Order created: {order['order_id']}")
        
        # 3. Create and fund Bitcoin HTLC
        # (Implementation depends on your Bitcoin library)
        # htlc_tx = create_and_fund_htlc(...)
        
        # 4. Verify HTLC
        verification = client.verify_htlc({
            'transaction_hex': 'htlc_tx_hex_here',
            'output_index': 0,
            'expected_amount': 50000,
            'expected_payment_hash': preimage_hash,
            'expected_recipient_pubkey': order['btc_to_eth_instructions']['htlc_requirements']['resolver_public_key'],
            'expected_sender_pubkey': 'your_public_key'
        })
        
        if not verification['valid']:
            raise Exception(f"HTLC verification failed: {verification['validation_errors']}")
        
        # 5. Monitor order status
        while True:
            order_status = client.get_order(order['order_id'])
            print(f"Order status: {order_status['status']}")
            
            if order_status['status'] in ['completed', 'failed', 'expired']:
                break
            
            time.sleep(10)  # Wait 10 seconds
        
        # 6. Handle completion
        if order_status['status'] == 'completed':
            print("Swap completed successfully!")
            # Use preimage to claim on Ethereum side
        elif order_status['status'] == 'expired':
            # Refund Bitcoin
            refund = client.refund_htlc(order_status['htlc_details']['htlc_id'])
            print(f"Refunded: {refund}")
        
    except requests.exceptions.HTTPError as e:
        print(f"API Error: {e.response.json()}")
    except Exception as e:
        print(f"Error: {str(e)}")


# Webhook handler example
from flask import Flask, request, jsonify
import hmac

app = Flask(__name__)
WEBHOOK_SECRET = 'your-webhook-secret-minimum-32-characters-long'

@app.route('/webhook/thunder-portal', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-Signature')
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        request.data,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Process webhook
    data = request.json
    event = data['event']
    order_id = data['order_id']
    
    print(f"Received {event} for order {order_id}")
    
    if event == 'order.bitcoin_htlc_funded':
        # HTLC has been funded
        print(f"HTLC funded: {data['data']['funding_tx']}")
    elif event == 'order.preimage_revealed':
        # Preimage is now available
        print(f"Preimage revealed, can claim funds")
    elif event == 'order.completed':
        # Swap completed
        print(f"Swap completed successfully")
    
    return jsonify({'received': True}), 200


if __name__ == '__main__':
    # Run example
    import asyncio
    asyncio.run(perform_btc_to_eth_swap())
```

### cURL

#### Common Operations

```bash
# Set variables
API_URL="https://api.thunderportal.io"
API_KEY="your-api-key"

# 1. Check service health
curl -X GET "${API_URL}/v1/health"

# 2. Create ETH to BTC order
ORDER_RESPONSE=$(curl -X POST "${API_URL}/v1/orders" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "100000",
    "fromToken": {
      "symbol": "ETH",
      "address": "0x0000000000000000000000000000000000000000"
    },
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "preimageHash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517"
  }')

# Extract order ID
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order_id')
echo "Order ID: $ORDER_ID"

# 3. Get order status
curl -X GET "${API_URL}/v1/orders/${ORDER_ID}" \
  -H "X-API-Key: ${API_KEY}" | jq '.status'

# 4. Submit Fusion proof
curl -X POST "${API_URL}/v1/orders/${ORDER_ID}/fusion-proof" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "fusion_order_id": "123456",
    "fusion_order_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "fusion_order_signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  }'

# 5. Verify HTLC
curl -X POST "${API_URL}/v1/htlc/verify" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "transaction_hex": "0200000001...",
    "output_index": 0,
    "expected_amount": 100000,
    "expected_payment_hash": "427df1e92d9a3098e68295890600b6eb0fef820ddcf68ad14e0b5b7f89872517",
    "expected_recipient_pubkey": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "expected_sender_pubkey": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
  }'

# 6. Claim HTLC
HTLC_ID="660e8400-e29b-41d4-a716-446655440000"
PREIMAGE="68656c6c6f20776f726c642074686973206973206120707265696d616765212121"

curl -X POST "${API_URL}/v1/htlc/${HTLC_ID}/claim" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"preimage\": \"${PREIMAGE}\"
  }"

# 7. Estimate fees
curl -X GET "${API_URL}/v1/fees/estimate?direction=ETH_TO_BTC&amount=100000&urgent=false" \
  -H "X-API-Key: ${API_KEY}" | jq

# 8. Register webhook
curl -X POST "${API_URL}/v1/webhooks" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "url": "https://your-server.com/webhooks/thunder-portal",
    "events": [
      "order.created",
      "order.bitcoin_htlc_funded",
      "order.completed"
    ],
    "secret": "your-webhook-secret-minimum-32-characters-long"
  }'

# 9. Monitor order with polling
while true; do
  STATUS=$(curl -s -X GET "${API_URL}/v1/orders/${ORDER_ID}" \
    -H "X-API-Key: ${API_KEY}" | jq -r '.status')
  
  echo "Current status: $STATUS"
  
  if [[ "$STATUS" == "completed" ]] || [[ "$STATUS" == "failed" ]] || [[ "$STATUS" == "expired" ]]; then
    break
  fi
  
  sleep 10
done
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Failed to connect to Bitcoin network"

**Symptoms**:
- Health check shows Bitcoin node disconnected
- Network errors when creating orders

**Solutions**:
- Check `BITCOIN_API_URL` in configuration
- Try alternative API endpoints:
  ```bash
  # Blockstream
  BITCOIN_API_URL=https://blockstream.info/testnet/api
  
  # BlockCypher
  BITCOIN_API_URL=https://api.blockcypher.com/v1/btc/test3
  ```
- Verify internet connectivity
- Check if API is rate-limited

#### 2. "Invalid public key" errors

**Symptoms**:
- 400 error with INVALID_PUBKEY code
- Order creation fails

**Solutions**:
- Ensure public keys are in hex format (66 characters for compressed)
- Verify network matches (testnet vs mainnet)
- Example valid testnet public key:
  ```
  03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd
  ```

#### 3. "HTLC verification failed"

**Symptoms**:
- Verify endpoint returns `valid: false`
- Validation errors in response

**Solutions**:
- Check transaction is fully signed
- Verify output index is correct
- Ensure amounts match exactly
- Confirm public keys match order

#### 4. "Insufficient balance" for resolver

**Symptoms**:
- Order creation succeeds but HTLC not created
- Error in order status

**Solutions**:
- Check resolver Bitcoin balance
- Reduce order amount
- Contact support for resolver funding

#### 5. "Transaction not found" errors

**Symptoms**:
- Transaction status returns 404
- Can't track Bitcoin transactions

**Solutions**:
- Wait for transaction to propagate (1-2 minutes)
- Check if using correct network (testnet/mainnet)
- Verify transaction was actually broadcast

#### 6. "Timeout too short" warnings

**Symptoms**:
- Order creation succeeds with warnings
- Refunds happen before completion

**Solutions**:
- Increase timeout values:
  ```json
  {
    "timeouts": {
      "ethereumBlocks": 300,
      "bitcoinBlocks": 288
    }
  }
  ```
- Account for network congestion
- Add 20% buffer to estimated times

### Debug Mode

Enable verbose logging for troubleshooting:

#### Server-side (if self-hosting)
```bash
RUST_LOG=debug,thunder_portal=trace cargo run
```

#### Client-side
```javascript
// Enable axios debugging
const axios = require('axios');

axios.interceptors.request.use(request => {
  console.log('Starting Request:', request);
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', response);
  return response;
});
```

### Network Connectivity Tests

```bash
# Test Bitcoin testnet connectivity
curl https://blockstream.info/testnet/api/blocks/tip/height

# Test Ethereum Sepolia connectivity
curl https://eth-sepolia.g.alchemy.com/v2/demo \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test Thunder Portal API
curl http://localhost:3000/v1/health
```

---

## Production Deployment

### Infrastructure Requirements

1. **Server Requirements**:
   - CPU: 4+ cores
   - RAM: 8GB minimum
   - Storage: 100GB SSD
   - Network: Stable, low-latency connection

2. **Database**:
   - PostgreSQL 13+ (recommended for production)
   - Regular backups
   - Replication for high availability

3. **Bitcoin Node** (optional but recommended):
   - Full node for reliability
   - Pruned node acceptable
   - Multiple nodes for redundancy

### Configuration

#### Production `.env`
```bash
# Server
HOST=0.0.0.0
PORT=3000
RUST_LOG=info,thunder_portal=warn

# Database
DATABASE_URL=postgresql://user:password@localhost/thunder_portal

# Bitcoin
BITCOIN_NETWORK=mainnet
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=your_rpc_user
BITCOIN_RPC_PASSWORD=your_secure_password

# Keys (use secure key management)
RESOLVER_PRIVATE_KEY=encrypted_or_hsm_reference

# Security
API_KEY_HASH=bcrypt_hashed_api_keys
RATE_LIMIT_PER_HOUR=1000

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
PROMETHEUS_ENDPOINT=/metrics
```

### Security Hardening

1. **Use HTTPS**:
   ```nginx
   server {
     listen 443 ssl http2;
     server_name api.thunderportal.io;
     
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

2. **Rate Limiting**:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   
   location /v1/ {
     limit_req zone=api burst=20 nodelay;
     proxy_pass http://localhost:3000;
   }
   ```

3. **API Key Management**:
   - Store hashed API keys
   - Implement key rotation
   - Use different keys per client
   - Monitor key usage

4. **Monitoring**:
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'thunder-portal'
       static_configs:
         - targets: ['localhost:3000']
   ```

### Deployment Checklist

- [ ] Generate secure resolver keys
- [ ] Configure production database
- [ ] Set up Bitcoin node connection
- [ ] Configure HTTPS/TLS
- [ ] Implement rate limiting
- [ ] Set up monitoring/alerting
- [ ] Configure log aggregation
- [ ] Test backup/restore procedures
- [ ] Document runbooks
- [ ] Set up on-call rotation

### Docker Deployment

```dockerfile
# Dockerfile
FROM rust:1.70 as builder

WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/thunder-portal /usr/local/bin/
COPY --from=builder /app/migrations /migrations

EXPOSE 3000
CMD ["thunder-portal"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  thunder-portal:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db/thunder_portal
      - BITCOIN_NETWORK=mainnet
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=thunder_portal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thunder-portal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: thunder-portal
  template:
    metadata:
      labels:
        app: thunder-portal
    spec:
      containers:
      - name: thunder-portal
        image: thunderportal/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: thunder-portal-secrets
              key: database-url
        - name: RESOLVER_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: thunder-portal-secrets
              key: resolver-private-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /v1/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: thunder-portal
spec:
  selector:
    app: thunder-portal
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

## Additional Resources

### Documentation

- [Thunder Portal GitHub Repository](https://github.com/thunder-portal/bitcoin-htlc)
- [1inch Fusion+ Documentation](https://docs.1inch.io/fusion)
- [Bitcoin Script Reference](https://en.bitcoin.it/wiki/Script)
- [Lightning Network BOLT Specifications](https://github.com/lightning/bolts)

### Libraries and SDKs

**JavaScript/TypeScript**:
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) - Bitcoin library
- [ethers.js](https://docs.ethers.io/) - Ethereum library
- [1inch Fusion SDK](https://github.com/1inch/fusion-sdk) - Fusion+ integration

**Python**:
- [python-bitcoinlib](https://github.com/petertodd/python-bitcoinlib) - Bitcoin library
- [web3.py](https://web3py.readthedocs.io/) - Ethereum library
- [requests](https://docs.python-requests.org/) - HTTP client

**Rust**:
- [rust-bitcoin](https://github.com/rust-bitcoin/rust-bitcoin) - Bitcoin library
- [actix-web](https://actix.rs/) - Web framework
- [sqlx](https://github.com/launchbadge/sqlx) - Database driver

### Tools

- [Bitcoin Testnet Explorer](https://blockstream.info/testnet/)
- [Ethereum Sepolia Explorer](https://sepolia.etherscan.io/)
- [Postman Collection](https://github.com/thunder-portal/postman-collection)
- [OpenAPI Specification](https://api.thunderportal.io/openapi.yaml)

### Community

- [Discord Server](https://discord.gg/thunderportal)
- [Telegram Group](https://t.me/thunderportal)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/thunder-portal)

### Learning Resources

- [Mastering Bitcoin](https://github.com/bitcoinbook/bitcoinbook) by Andreas Antonopoulos
- [Bitcoin Developer Guide](https://bitcoin.org/en/developer-guide)
- [Ethereum Development Tutorial](https://ethereum.org/en/developers/tutorials/)
- [Atomic Swaps Explained](https://www.coindesk.com/tech/2021/05/20/what-are-atomic-swaps/)

---

## Conclusion

Thunder Portal provides a robust, secure way to perform trustless atomic swaps between Bitcoin and Ethereum networks. By following this tutorial and best practices, you can integrate cross-chain swaps into your applications with confidence.

For support, please refer to our community channels or create an issue on GitHub.

Happy swapping! 🚀