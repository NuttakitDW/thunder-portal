# Thunder Portal - Bitcoin ⚡ Ethereum Atomic Swaps

Thunder Portal enables trustless atomic swaps between Bitcoin and Ethereum through 1inch Fusion+ integration. No bridges, no wrapped tokens, just pure cryptographic security.

## 🚀 What is Thunder Portal?

A complete implementation that extends 1inch Fusion+ to support Bitcoin, enabling:
- **Trustless Swaps**: Direct BTC ⟷ ETH trades without intermediaries
- **No Bridge Risk**: Uses HTLCs instead of wrapped tokens
- **Partial Fulfillment**: Orders split into 100 chunks for better liquidity
- **Dual Escrow System**: Coordinated escrows on both Ethereum and Bitcoin
- **Presigned Transactions**: Bitcoin security model borrowed from Lightning
- **Professional Liquidity**: Resolver network provides competitive rates
- **Gas-Free**: Users pay zero gas fees (resolvers handle everything)

## 🏗️ Architecture

### Complete System Architecture

```mermaid
graph TB
    subgraph "User Layer"
        Maker[Maker/User]
        Taker[Taker/Resolver]
    end
    
    subgraph "1inch Fusion+ Protocol"
        UI[1inch Interface]
        FP[Fusion+ Protocol]
        OC[Order Chunking<br/>100 chunks]
        OM[Order Matching]
    end
    
    subgraph "Thunder Portal System"
        TPR[Thunder Portal<br/>Resolver]
        HTLC[Rust HTLC Service]
        PM[Presign Manager]
        DB[(Order Database)]
    end
    
    subgraph "Blockchain Layer"
        subgraph "Ethereum"
            ESC[Escrow Contract<br/>EscrowSrc/Dst]
            SC[Settlement Contract]
        end
        subgraph "Bitcoin"
            BTC[Bitcoin Network]
            BHTLC[Bitcoin HTLC<br/>Presigned TX]
        end
    end
    
    Maker -->|Create Intent| UI
    UI -->|Submit Order| FP
    FP -->|Break into chunks| OC
    OC -->|Partial Orders| OM
    OM -->|Matched Orders| TPR
    
    TPR -->|Create ETH Escrow| ESC
    TPR -->|Request HTLC| HTLC
    HTLC -->|Generate Presigned| PM
    PM -->|Deploy HTLC| BHTLC
    
    Taker -->|Monitor Orders| TPR
    TPR <--> DB
    ESC <--> SC
    HTLC <--> BTC
    
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

1. **Order Chunking System**
   - Breaks large orders into 100 equal chunks
   - Enables partial fulfillment by multiple resolvers
   - Each chunk can be independently matched and settled
   - Example: 1 BTC order → 100 chunks of 0.01 BTC each

2. **Dual Escrow System**
   - **Ethereum Side**: Uses 1inch EscrowSrc/EscrowDst contracts
   - **Bitcoin Side**: Creates HTLCs with presigned transactions
   - Both escrows use the same cryptographic hash
   - Atomic execution guaranteed by shared secret

3. **Presigned Transaction Model**
   - Borrowed from Bitcoin Lightning Network concepts
   - Creates refund transactions signed before funding
   - Enables trustless timeout guarantees
   - Key components:
     - Funding transaction (creates HTLC)
     - Claim transaction (presigned, reveals secret)
     - Refund transaction (presigned, time-locked)

4. **Thunder Portal Resolver**
   - Monitors chunked orders from 1inch
   - Manages presigned transaction creation
   - Coordinates dual escrow deployment
   - Handles partial order fulfillment

5. **Rust HTLC Service**
   - Generates Bitcoin scripts and addresses
   - Creates presigned transactions
   - Manages UTXO selection and fee calculation
   - Provides APIs for resolver integration

## 🔄 How It Works

### ETH → BTC Swap (with Chunking & Dual Escrow)

```mermaid
sequenceDiagram
    participant Maker
    participant 1inch
    participant Protocol
    participant Resolver
    participant Ethereum
    participant Bitcoin

    Maker->>1inch: Create intent (1 ETH → 0.05 BTC)
    1inch->>Protocol: Process order
    Protocol->>Protocol: Split into 100 chunks
    Note over Protocol: Each chunk: 0.01 ETH → 0.0005 BTC
    
    Protocol->>Resolver: Broadcast chunked orders
    Note over Resolver: Dutch auction for chunks
    
    Resolver->>Ethereum: Create EscrowSrc (ETH locked)
    Resolver->>Bitcoin: Create presigned HTLC
    Note over Bitcoin: Funding TX + Presigned Claim/Refund
    
    Resolver->>Protocol: Fill chunks with proof
    Protocol->>Maker: Chunks matched notification
    
    Maker->>Bitcoin: Claim BTC (reveal secret)
    Resolver->>Ethereum: Claim ETH (use secret)
    Note over Ethereum,Bitcoin: Atomic execution complete
```

### BTC → ETH Swap (with Presigned Model)

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

### Presigned Transaction Structure

```mermaid
graph TD
    subgraph "Transaction Flow"
        FT[Funding TX<br/>Creates HTLC Output]
        CT[Claim TX<br/>Presigned<br/>Requires Secret]
        RT[Refund TX<br/>Presigned<br/>Time-locked]
    end
    
    FT -->|Spends to| HTLC[HTLC Address]
    HTLC -->|Path 1| CT
    HTLC -->|Path 2| RT
    
    style FT fill:#9f9,stroke:#333,stroke-width:2px
    style CT fill:#99f,stroke:#333,stroke-width:2px
    style RT fill:#f99,stroke:#333,stroke-width:2px
```

**Key Properties:**
- **Funding TX**: Broadcast immediately to create HTLC
- **Claim TX**: Presigned but requires secret revelation
- **Refund TX**: Presigned with timelock, ensures maker can recover funds
- **Atomic Safety**: Refund TX protects against resolver misbehavior

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

- **Timeout Hierarchy**: BTC (48h) > ETH (24h) prevents race conditions
- **Atomic Guarantee**: All-or-nothing execution
- **No Custody**: Users control funds throughout

### API Endpoints
- `POST /v1/orders` - Create swap order
- `POST /v1/htlc/create` - Generate HTLC
- `POST /v1/htlc/verify` - Verify HTLC
- `POST /v1/htlc/{id}/claim` - Claim with preimage
- `GET /v1/health` - Service status

## 🚦 Current Status

### ✅ Implemented
- Complete Rust backend with all endpoints
- Bitcoin HTLC generation and verification
- SQLite database with migrations
- Docker support
- Comprehensive test suite
- Full API documentation

### 🚧 Next Steps
- Live Bitcoin network integration
- Production Fusion+ testing
- Transaction monitoring
- Mainnet deployment

## 🏃 Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/thunder-portal
cd thunder-portal

# Start HTLC service
cd rust-backend
cargo run --release

# In another terminal, start resolver
cd ../typescript-resolver
npm install
npm start
```

### Docker
```bash
docker-compose up -d
```

## 🎯 Key Features

- **No Bridges**: Direct on-chain settlement
- **Professional Market Making**: Resolver competition ensures best rates
- **Gas Abstraction**: Users never pay transaction fees
- **Multi-Language**: TypeScript for business logic, Rust for Bitcoin
- **Production Ready**: Complete implementation with tests

### 💡 Key Innovation: Order Chunking for Partial Fulfillment

```mermaid
graph LR
    subgraph "Traditional Swaps"
        TO[1 BTC Order] -->|All or Nothing| TF[Single Fill]
    end
    
    subgraph "Thunder Portal Innovation"
        O[1 BTC Order] -->|Protocol Chunks| C[100 x 0.01 BTC]
        C -->|Resolver 1| P1[25 chunks]
        C -->|Resolver 2| P2[50 chunks]
        C -->|Resolver 3| P3[25 chunks]
    end
    
    style C fill:#f9f,stroke:#333,stroke-width:4px
```

**Benefits of Chunking:**
- **Better Liquidity**: Multiple resolvers can fill one order
- **Risk Distribution**: Resolvers can participate with smaller capital
- **Improved Execution**: Partial fills ensure better price discovery
- **User Experience**: Orders execute even with fragmented liquidity

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

### Why Presigned Transactions?
- **Trust Minimization**: Refund guaranteed even if resolver disappears
- **Bitcoin Limitation**: Bitcoin script can't directly interact with Ethereum
- **Lightning Inspiration**: Proven model from Lightning Network

### Order Chunking Details
- **Fixed at 100**: Every order splits into exactly 100 chunks
- **Protocol Level**: Handled by 1inch Fusion+, not Thunder Portal
- **Flexible Fulfillment**: Resolvers can take 1-100 chunks based on liquidity

### Maker vs Resolver Roles
- **Makers**: Create intents, don't need to run infrastructure
- **Resolvers**: Professional market makers who run Thunder Portal
- **Separation**: Makers just sign, resolvers handle all execution

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Thunder Portal** - Bringing Bitcoin's $800B to DeFi, trustlessly.