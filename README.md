# ⚡ Thunder Portal - Bitcoin ⟷ Ethereum Atomic Swaps

**Hackathon Demo**: Trustless atomic swaps between Bitcoin and Ethereum. No bridges, no wrapped tokens, just cryptographic guarantees.

## 🚀 Quick Start (2 Minutes)

### Prerequisites
- Git
- Node.js 18+
- Rust 1.70+
- Docker (for local blockchain nodes)

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/NuttakitDW/thunder-portal.git
cd thunder-portal

# Option 1: Interactive Demo (Recommended)
make thunder

# Option 2: Real Testnet Demo (Coming Soon)
make swap-testnet
```

## 🎮 Demo Commands

| Command | Description | Time |
|---------|-------------|------|
| `make thunder` | Beautiful interactive CLI demo with visual atomic swap | 30 sec |
| `make swap-testnet` | Real Bitcoin testnet ⟷ Ethereum Sepolia swap (coming soon) | 60 sec |

### What You'll See with `make thunder`

```
⚡ THUNDER PORTAL - ATOMIC SWAP DEMO
════════════════════════════════════

Creating atomic swap order...
✅ Order created: 0.1 BTC → 2.0 ETH

Chunking order (100 pieces)...
[████████████████████] 100%

Resolvers filling order...
• Resolver 1: 25% (0.025 BTC)
• Resolver 2: 25% (0.025 BTC)
• Resolver 3: 25% (0.025 BTC)
• Resolver 4: 25% (0.025 BTC)

Atomic execution...
✅ Bitcoin HTLC funded
✅ Ethereum escrow funded
✅ Secrets revealed
✅ Atomic swap complete!

Transaction Details:
• Bitcoin TX: abc123...
• Ethereum TX: 0xdef456...
```

## 🏗️ How It Works

1. **Order Creation**: User wants to swap BTC for ETH
2. **Chunking**: Order split into 100 pieces for liquidity
3. **Dual Escrow**: HTLCs created on both chains
4. **Atomic Execution**: Reveal secret to claim both sides
5. **No Trust Required**: Math guarantees fairness

## 🔑 Key Innovation

- **No Bridges**: Direct Bitcoin ⟷ Ethereum swaps
- **No Wrapped Tokens**: Real BTC, real ETH
- **Atomic Guarantee**: All or nothing execution
- **Professional Liquidity**: Resolver network provides competitive rates

## 🎯 Problem We Solve

Current cross-chain bridges have lost **$2.5 billion** to hacks. Thunder Portal eliminates bridge risk by using HTLCs - the same technology securing Bitcoin's Lightning Network.

## 💡 Market Impact

Unlocks **$800 billion** Bitcoin market for DeFi without wrapped tokens or custodial risk.

---

## 📊 Technical Architecture

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

### ETH → BTC Swap Flow

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

### Security Model - Timeout Hierarchy

```mermaid
timeline
    title Timeout Hierarchy for Safe Atomic Swaps
    
    0h     : Swap Initiated
    24h    : Ethereum Timeout
           : (ETH can be refunded)
    48h    : Bitcoin Timeout
           : (BTC can be refunded)
```

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

### Merkle Tree-Based Partial Fulfillment

```mermaid
graph TB
    subgraph "Order Creation"
        O[1 BTC Order] --> S[Generate 100 Secrets]
        S --> MT[Build Merkle Tree]
        MT --> MR[Merkle Root in Order]
    end
    
    subgraph "Merkle Tree Structure"
        MR --> L1["Leaf 0: hash(0, secret0)"]
        MR --> L2["Leaf 1: hash(1, secret1)"]
        MR --> L3["..."]
        MR --> L100["Leaf 99: hash(99, secret99)"]
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

---

**Thunder Portal** - Trustless Bitcoin DeFi is Here ⚡