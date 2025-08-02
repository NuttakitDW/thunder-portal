# Thunder Portal - Bitcoin ⚡ Ethereum Atomic Swaps

Thunder Portal enables trustless atomic swaps between Bitcoin and Ethereum through 1inch Fusion+ integration. No bridges, no wrapped tokens, just pure cryptographic security.

## 🚀 What is Thunder Portal?

A complete implementation that extends 1inch Fusion+ to support Bitcoin, enabling:
- **Trustless Swaps**: Direct BTC ⟷ ETH trades without intermediaries
- **No Bridge Risk**: Uses HTLCs instead of wrapped tokens
- **Partial Fulfillment**: Orders split into 100 chunks for better liquidity
- **Dual Escrow System**: Coordinated escrows on both Ethereum and Bitcoin
- **Presigned Refunds**: Bitcoin security model borrowed from Lightning (refunds only, not claims)
- **Professional Liquidity**: Resolver network provides competitive rates
- **Gas-Free**: Users pay zero gas fees (resolvers handle everything)

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+ 
- Git

### One Command Demo

```bash
# Clone and run everything
git clone https://github.com/thunder-portal/thunder-portal
cd thunder-portal
make thunder
```

This will:
1. Install all dependencies
2. Start Bitcoin regtest and Ethereum local networks
3. Deploy smart contracts
4. Start all backend services
5. Launch the Thunder CLI with beautiful interface

### Alternative: Step by Step

```bash
# 1. Setup
make setup      # Install dependencies

# 2. Start services
make start      # Start Bitcoin, Ethereum, and all backend services

# 3. Run Thunder CLI
make cli-demo   # Launch interactive demo
# OR
make cli        # Production mode
```

### Thunder CLI Commands

| Command | Description |
|---------|-------------|
| `make thunder` | One-command setup + start + demo |
| `make cli-demo` | Run CLI in demo mode with auto-progression |
| `make cli-judge` | Special demo for hackathon judges |
| `make cli` | Run CLI in production mode |
| `make start` | Start all backend services |
| `make stop` | Stop all services |
| `make clean` | Clean and reset everything |
| `make logs` | View service logs |
| `make help` | Show all available commands |

### What You'll See

1. **Beautiful Thunder CLI** - Yellow lightning-themed terminal interface
2. **Live Order Chunking** - Visual display of 100-piece order splitting
3. **Real-time Progress** - Automatic progression from 0% to 100%
4. **Bitcoin Claiming** - One-click interface when ready
5. **Transaction Hashes** - Real Bitcoin and Ethereum transactions

## 🏗️ Architecture

### Complete System Architecture

```mermaid
graph TB
    subgraph "User Layer"
        Maker[Maker/User]
        Taker[Taker/Resolver]
    end
    
    subgraph "Thunder Portal Fork"
        TUI[Thunder Portal UI<br/>BTC Support Added]
        TFP[Forked Fusion+ Protocol<br/>Extended for Bitcoin]
        OC[Order Chunking<br/>100 chunks]
        OM[Order Matching Engine]
    end
    
    subgraph "Thunder Portal Backend"
        TPR[Thunder Portal<br/>Resolver]
        HTLC[Rust HTLC Service]
        PM[Presign Manager]
        DB[(Order Database)]
    end
    
    subgraph "Blockchain Layer"
        subgraph "Ethereum"
            ESC[Escrow Contract<br/>EscrowSrc/Dst]
            SC[1inch Settlement]
        end
        subgraph "Bitcoin"
            BTC[Bitcoin Network]
            BHTLC[Bitcoin HTLC<br/>Refund TX Only]
        end
    end
    
    Maker -->|Create BTC Intent| TUI
    TUI -->|Submit Order| TFP
    TFP -->|Break into chunks| OC
    OC -->|Partial Orders| OM
    OM -->|Matched Orders| TPR
    
    TPR -->|Create ETH Escrow| ESC
    TPR -->|Request HTLC| HTLC
    HTLC -->|Generate Refund TX| PM
    PM -->|Deploy HTLC| BHTLC
    
    Taker -->|Monitor Orders| TPR
    TPR <--> DB
    ESC <--> SC
    HTLC <--> BTC
    
    style TFP fill:#f9f,stroke:#333,stroke-width:4px
    style OC fill:#f9f,stroke:#333,stroke-width:4px
    style PM fill:#f9f,stroke:#333,stroke-width:4px
```

### Order Flow & Chunking

```mermaid
flowchart LR
    subgraph "Order Creation"
        O[Original Order<br/>1 BTC ⟷ 20 ETH]
    end
    
    subgraph "Chunking Process"
        C1[Chunk 1<br/>0.01 BTC]
        C2[Chunk 2<br/>0.01 BTC]
        C3[...]
        C100[Chunk 100<br/>0.01 BTC]
    end
    
    subgraph "Partial Fulfillment"
        F1[Filled: 25 chunks]
        F2[Filled: 50 chunks]
        F3[Remaining: 25 chunks]
    end
    
    O -->|Protocol splits| C1
    O --> C2
    O --> C3
    O --> C100
    
    C1 --> F1
    C2 --> F1
    C3 --> F2
    C100 --> F3
```

### Core Components Explained

1. **Forked 1inch Fusion+ Protocol**
   - **Why Fork?**: Current Fusion+ doesn't support Bitcoin orders
   - **Key Extensions**:
     - Added Bitcoin as supported asset type
     - Extended order structure for BTC addresses
     - Modified matching engine for cross-chain orders
     - Integrated HTLC verification requirements

2. **Order Chunking System with Merkle Trees**
   - Breaks large orders into 100 equal chunks
   - Enables partial fulfillment by multiple resolvers
   - Each chunk can be independently matched and settled
   - Example: 1 BTC order → 100 chunks of 0.01 BTC each
   
   **Merkle Tree Implementation**:
   - **101 Secrets Generated**: For 100 chunks, 101 secrets are created
     - Secrets 0-99: For partial fills (1% each)
     - Secret 100: Special secret for complete fill (100% at once)
   - **Merkle Leaves**: Each leaf = `keccak256(index, hashedSecret)`
   - **Merkle Root**: Embedded in order's `hashlockInfo` field
   - **Progressive Filling**: Secrets must be revealed in order based on fill percentage
   - **No Reuse**: Each secret can only be used once via `MerkleStorageInvalidator`

3. **Dual Escrow System**
   - **Ethereum Side**: Deploys ONE EscrowSrc/EscrowDst proxy per order
     - Single escrow manages all 100 chunks
     - Merkle root stored in escrow validates each partial fill
   - **Bitcoin Side**: Creates HTLCs with presigned transactions
   - Both escrows use the same cryptographic hash (merkle root)
   - Atomic execution guaranteed by shared secret
   - **Per-Order Isolation**: Each swap gets dedicated escrow contracts

4. **Presigned Refund Model**
   - Borrowed from Bitcoin Lightning Network concepts
   - Creates refund transactions signed before funding
   - Enables trustless timeout guarantees
   - Key components:
     - Funding transaction (creates HTLC)
     - Claim transaction (CANNOT be presigned - needs secret)
     - Refund transaction (presigned, time-locked)
   - Note: Claims require user to be online with one-click UX

5. **Thunder Portal Resolver**
   - Monitors chunked orders from forked protocol
   - Manages presigned transaction creation
   - Coordinates dual escrow deployment
   - Handles partial order fulfillment

6. **Rust HTLC Service**
   - Generates Bitcoin scripts and addresses
   - Creates presigned transactions
   - Manages UTXO selection and fee calculation
   - Provides APIs for resolver integration

## 🔄 How It Works

### ETH → BTC Swap (with Forked Protocol)

```mermaid
sequenceDiagram
    participant Maker
    participant ThunderUI as Thunder Portal UI
    participant ForkedProtocol as Forked Fusion+
    participant Resolver
    participant Ethereum
    participant Bitcoin

    Maker->>ThunderUI: Create intent (1 ETH → 0.05 BTC)
    Note over ThunderUI: Bitcoin address support added
    ThunderUI->>ForkedProtocol: Process BTC order
    ForkedProtocol->>ForkedProtocol: Split into 100 chunks
    Note over ForkedProtocol: Each chunk: 0.01 ETH → 0.0005 BTC
    
    ForkedProtocol->>Resolver: Broadcast chunked orders
    Note over Resolver: Dutch auction for chunks
    
    Resolver->>Ethereum: Deploy EscrowSrc proxy (ETH locked)
    Note over Ethereum: New proxy for this order via Factory
    Resolver->>Bitcoin: Create presigned HTLC
    Note over Bitcoin: Funding TX + Refund TX only
    
    Resolver->>ForkedProtocol: Fill chunks with proof
    ForkedProtocol->>Maker: Chunks matched notification
    
    Maker->>Bitcoin: Claim BTC (reveal secret)
    Resolver->>Ethereum: Claim ETH (use secret)
    Note over Ethereum,Bitcoin: Atomic execution complete
```

### BTC → ETH Swap (with One-Click Claims)

```mermaid
sequenceDiagram
    participant Maker
    participant Bitcoin
    participant ThunderPortal
    participant 1inch
    participant Ethereum

    Maker->>Bitcoin: Create presigned HTLC
    Note over Bitcoin: Fund + Sign claim/refund TXs
    
    Maker->>ThunderPortal: Submit HTLC + presigned TXs
    ThunderPortal->>Bitcoin: Verify HTLC funded
    
    ThunderPortal->>1inch: Create Fusion+ order
    1inch->>1inch: Chunk into 100 parts
    
    ThunderPortal->>Ethereum: Create EscrowDst chunks
    Note over Ethereum: Resolver funds ETH escrow
    
    Maker->>Ethereum: Claim ETH (reveal secret)
    ThunderPortal->>Bitcoin: Broadcast presigned claim TX
    Note over Bitcoin: Uses revealed secret
```

## 🛠️ Technical Details

### Extended Order Structure for Cross-Chain Swaps

Thunder Portal extends the standard 1inch Fusion+ order structure to support Bitcoin addresses and cross-chain HTLC parameters:

```solidity
struct CrossChainOrderData {
    // Standard 1inch Order fields
    IOrderMixin.Order baseOrder;
    
    // Cross-chain extensions
    string btcAddress;           // Bitcoin address (segwit/legacy/P2SH)
    bytes32 htlcHashlock;       // Hash for both HTLCs
    uint256 htlcTimeout;        // Bitcoin timeout (must be > Ethereum timeout)
    uint256 minConfirmations;   // Required Bitcoin confirmations
}
```

**Key Features:**
- **Bitcoin Address Support**: Validates legacy (1...), P2SH (3...), and Segwit (bc1...) addresses
- **Unified Hashlock**: Same hash used for both Bitcoin and Ethereum HTLCs
- **Timeout Hierarchy**: Enforces Bitcoin timeout > Ethereum timeout for safety
- **Confirmation Requirements**: Configurable Bitcoin confirmation threshold

### Bitcoin HTLC Structure
```bitcoin
IF
    # Claim path (with secret)
    OP_HASH256 <secret_hash> OP_EQUALVERIFY
    OP_DUP OP_HASH160 <recipient_pubkey_hash> OP_EQUALVERIFY
    OP_CHECKSIG
ELSE
    # Refund path (after timeout)
    <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP
    OP_DUP OP_HASH160 <sender_pubkey_hash> OP_EQUALVERIFY
    OP_CHECKSIG
ENDIF
```

### Transaction Structure & User Claims

```mermaid
graph TD
    subgraph "Transaction Flow"
        FT[Funding TX<br/>Creates HTLC Output]
        CT[Claim TX<br/>NOT Presigned<br/>Needs Secret + User Signature]
        RT[Refund TX<br/>Presigned<br/>Time-locked]
    end
    
    FT -->|Spends to| HTLC[HTLC Address]
    HTLC -->|Path 1| CT
    HTLC -->|Path 2| RT
    
    style FT fill:#9f9,stroke:#333,stroke-width:2px
    style CT fill:#fbb,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
    style RT fill:#f99,stroke:#333,stroke-width:2px
```

**Key Properties:**
- **Funding TX**: Broadcast immediately to create HTLC
- **Claim TX**: Cannot be presigned (secret unknown at creation time)
- **Refund TX**: Presigned with timelock, ensures user can recover funds
- **User Claims**: Simplified one-click interface when secret is revealed

### Security Model

```mermaid
timeline
    title Timeout Hierarchy for Safe Atomic Swaps
    
    0h     : Swap Initiated
    24h    : Ethereum Timeout
           : (ETH can be refunded)
    48h    : Bitcoin Timeout
           : (BTC can be refunded)
```

## 📁 Project Structure

```
thunder-portal/
├── bitcoin-htlc/        # Rust service for Bitcoin HTLC operations
├── resolver/            # Order matching and coordination service
├── relayer/            # Cross-chain event monitoring service
├── evm-resolver/       # Ethereum smart contracts
├── thunder-cli/        # Beautiful terminal interface
├── scripts/            # Deployment and utility scripts
├── logs/              # Service logs
└── Makefile           # All commands you need
```

## 🎯 Key Features

- **No Bridges**: Direct on-chain settlement
- **Professional Market Making**: Resolver competition ensures best rates
- **Gas Abstraction**: Users never pay transaction fees
- **Multi-Language**: TypeScript for business logic, Rust for Bitcoin
- **Production Ready**: Complete implementation with tests

### 💡 Key Innovation: Merkle Tree-Based Partial Fulfillment

```mermaid
graph TB
    subgraph "Order Creation"
        O[1 BTC Order] --> S[Generate 101 Secrets]
        S --> MT[Build Merkle Tree]
        MT --> MR[Merkle Root in Order]
    end
    
    subgraph "Merkle Tree Structure"
        MR --> L1[Leaf 0: hash(0, secret0)]
        MR --> L2[Leaf 1: hash(1, secret1)]
        MR --> L3[...]
        MR --> L100[Leaf 100: hash(100, secret100)]
    end
    
    subgraph "Partial Fills"
        L1 -->|1% fill| R1[Resolver 1]
        L2 -->|1% fill| R1
        L3 -->|...| R2[Resolver 2]
        L100 -->|Final chunk| R3[Resolver 3]
    end
    
    style MT fill:#f9f,stroke:#333,stroke-width:4px
    style MR fill:#9f9,stroke:#333,stroke-width:4px
```

**How Merkle Trees Enable Chunking:**

1. **Secret Generation**:
   ```solidity
   // For 100 chunks, generate 101 secrets
   bytes32[] secrets = new bytes32[](101);
   for (uint i = 0; i < 101; i++) {
       secrets[i] = keccak256(randomBytes);
   }
   ```

2. **Merkle Tree Construction**:
   ```solidity
   // Create merkle leaves
   bytes32[] leaves = new bytes32[](101);
   for (uint i = 0; i < 101; i++) {
       leaves[i] = keccak256(abi.encodePacked(i, hash(secrets[i])));
   }
   // Build tree and get root
   bytes32 merkleRoot = buildMerkleTree(leaves);
   ```

3. **Progressive Revelation**:
   - Resolver filling 1-25%: Must reveal secrets 0-24
   - Resolver filling 26-50%: Must reveal secrets 25-49
   - Resolver filling 100% at once: Uses secret 100 (special complete fill)
   - Each secret can only be used once
   - MerkleStorageInvalidator tracks used indices

4. **Security Properties**:
   - **Atomic per Chunk**: Each 1% chunk is atomic
   - **No Front-Running**: Secrets must match merkle proof
   - **Progressive Execution**: Can't skip ahead in sequence
   - **Double-Spend Prevention**: Each index used only once

**Benefits of Merkle-Based Chunking:**
- **Cryptographic Security**: Verifiable partial execution
- **Capital Efficiency**: Resolvers can fill exact amounts
- **Parallel Execution**: Multiple resolvers simultaneously
- **Gas Optimization**: Only verify used branches

## 🔮 Future Enhancements

- **Lightning Network**: Instant settlements
- **Partial Fills**: Split large orders
- **More Chains**: Extend to other UTXO chains
- **Advanced Routing**: Optimize for best execution

## ❓ Important Clarifications

### How Dual Escrow Works
1. **Same Hash, Two Chains**: Both Ethereum escrow and Bitcoin HTLC use identical hash
2. **Atomic Guarantee**: Revealing secret on one chain enables claim on the other
3. **No Double Spend**: Mathematical impossibility to claim one without enabling the other

### Escrow Contract Deployment
- **One Escrow Per Order**: A single escrow handles all 100 chunks via merkle tree
- **Not Reused**: Each order deploys new escrow proxy contracts
- **Gas Efficient**: Uses OpenZeppelin Clones (minimal proxy pattern)
- **Chunk Management**: Merkle tree in escrow validates each partial fill
- **Deterministic Addresses**: CREATE2 ensures predictable contract addresses
- **Implementation Pattern**: Shared logic contract, unique proxy per order
- **Security**: Complete isolation between different swaps

### Why Presigned Refunds (Not Claims)?
- **Refund Protection**: Guaranteed recovery if swap fails
- **Claim Limitation**: Claims cannot be presigned (secret unknown)
- **User Experience**: One-click claiming when secret revealed
- **Bitcoin Reality**: Signatures must include all transaction data

### User-Friendly Bitcoin Claiming

When users need to claim Bitcoin after an ETH → BTC swap:

#### What Happens Behind the Scenes
1. **Secret Detection**: Thunder Portal monitors Ethereum for secret revelation
2. **Instant Notification**: User gets notified "Your Bitcoin is ready!"
3. **One-Click Interface**: Simple button to claim Bitcoin
4. **Wallet Integration**: Works with popular Bitcoin wallets (Xverse, UniSat, Leather)
5. **Automatic Execution**: Thunder Portal handles all complexity

#### User Experience
```
┌─────────────────────────────────────┐
│     🎉 Your Bitcoin is Ready!       │
│                                     │
│  Amount: 0.5 BTC                    │
│  Status: ✅ Ready to claim          │
│                                     │
│     [ 💰 CLAIM MY BITCOIN ]         │
│                                     │
└─────────────────────────────────────┘
```

The user simply:
1. Receives notification
2. Opens Thunder Portal
3. Clicks "Claim My Bitcoin"
4. Approves in their wallet
5. Done! Bitcoin received

No need to understand HTLCs, secrets, or Bitcoin Script!

### Why Fork 1inch Fusion+?
- **No Native Bitcoin Support**: Current protocol only handles EVM chains
- **Address Format**: Bitcoin addresses need special handling
- **Settlement Time**: Bitcoin's longer confirmation times need accommodation
- **HTLC Integration**: Protocol must understand cross-chain atomic swaps

### Order Chunking & Merkle Tree Details
- **Fixed at 100**: Every order splits into exactly 100 chunks
- **101 Secrets**: 
  - Secrets 0-99: For partial fills (1% increments)
  - Secret 100: Special secret for complete fill (100% at once)
- **Merkle Root**: Embedded in order, verifies all partial fills
- **Progressive Indices**: Secrets revealed based on cumulative fill %
- **Complete Fill Optimization**: Resolver can use secret 100 to fill entire order
- **Protocol Level**: Handled by forked Fusion+ protocol
- **Flexible Fulfillment**: Resolvers can take 1-100 chunks or complete fill
- **Index Calculation**: 
  - Partial: `idx = 100 * (cumulativeFill - 1) / totalAmount`
  - Complete: `idx = 100` (uses special secret)
- **Security**: MerkleStorageInvalidator prevents secret reuse

## 🌐 Production Deployment

Thunder Portal is deployed on **Sepolia Testnet** for testing:

### Deployed Contracts
- **LimitOrderProtocol**: [`0xEa8CbF5175397686aE471f3f7e523279b927495d`](https://sepolia.etherscan.io/address/0xEa8CbF5175397686aE471f3f7e523279b927495d#code)
- **SimpleEscrowFactory**: [`0x182a69979dDAf5aD9406b1A3138bcAE484E41d06`](https://sepolia.etherscan.io/address/0x182a69979dDAf5aD9406b1A3138bcAE484E41d06#code)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Thunder Portal** - Bringing Bitcoin's $800B to DeFi, trustlessly.