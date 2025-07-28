<div align="center">
  <img src="assets/logos/logo-banner-dark.png" alt="Thunder Portal" width="100%" />
</div>

<h1 align="center">⚡ Thunder Portal</h1>

<p align="center">
  <strong>Native Bitcoin support for 1inch Fusion+ cross-chain swaps</strong>
</p>

<p align="center">
  Thunder Portal extends 1inch Fusion+ to enable trustless, bidirectional swaps between Ethereum and Bitcoin networks using atomic swap technology.
</p>

## 🚀 The Problem

Bitcoin's $800B market cap is locked out of DeFi. Current solutions require:
- **Wrapped tokens** (WBTC) = Centralized custody risk
- **Traditional bridges** = Slow, expensive, hackable
- **CEXs** = Not your keys, not your coins

## ⚡ The Solution

Thunder Portal brings **native Bitcoin** to 1inch Fusion+ using atomic swaps. No wrapping, no bridges, no custody.

**How?** We built a custom resolver that coordinates HTLCs between Bitcoin and Ethereum, enabling trustless BTC ↔ ETH swaps directly through the 1inch interface.

## 🏗️ How It Works

### Simple Atomic Swap Flow

```
1. User creates 1inch Fusion+ order: "Swap my ETH for BTC"
   ↓
2. Thunder Portal resolver locks BTC in Bitcoin HTLC
   ↓  
3. Resolver fills Fusion+ order (ETH locked with same secret)
   ↓
4. User claims BTC by revealing secret
   ↓
5. Resolver uses secret to claim ETH
```

**The Magic**: Both sides use the same secret hash. If one side fails, both timeout and refund. True atomic execution.

### Why This Matters

- **No Wrapped Tokens**: Trade real BTC, not IOUs
- **No Bridge Hacks**: HTLCs are mathematically secure
- **No Custody Risk**: Funds locked in contracts, not wallets
- **Native 1inch UX**: Works directly in Fusion+ interface

## 💡 Technical Innovation

**The Challenge**: Bitcoin has no smart contracts. Ethereum has no native BTC. How do you atomically swap between them?

**Our Solution**: 
1. **Unified Hash Coordination** - Same cryptographic secret controls both chains
2. **Intent-to-HTLC Bridge** - Fusion+ intents trigger Bitcoin HTLCs automatically  
3. **Timeout Hierarchy** - Bitcoin timeout > Ethereum timeout prevents attacks
4. **Resolver Network** - Professional market makers provide liquidity

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/thunder-portal/thunder-portal.git
cd thunder-portal && npm install

# Configure
cp .env.example .env
# Add your Bitcoin node and Ethereum RPC

# Run
npm run start:api      # Bitcoin HTLC service
npm run start:resolver # Fusion+ resolver
```

## 📊 Why We Win

| Solution | Thunder Portal | WBTC | Traditional Bridges |
|----------|---------------|------|--------------------|
| **Trust Model** | Trustless (Math) | BitGo Custody | Bridge Operators |
| **Asset Type** | Native BTC | Wrapped IOU | Wrapped IOU |
| **Hack Risk** | Impossible* | Custody Risk | Bridge Hacks |
| **1inch Native** | ✅ Yes | ❌ No | ❌ No |

*HTLCs are cryptographically secure - no honeypot to hack



## 👥 Team

- **[Nuttakit DW](https://github.com/NuttakitDW)** - Blockchain Engineer | Rust, Solidity, ZK
- **[Kongphop Kingpeth](https://github.com/JFKongphop)** - Full-Stack Developer | DeFi, Smart Contracts
- **[Yuttakhan B.](https://github.com/badgooooor)** - Developer | [yuttakhanb.dev](https://yuttakhanb.dev)

---

<p align="center">
  <strong>⚡ Thunder Portal - Bringing Bitcoin to DeFi</strong><br>
  <em>1inch Unite Hackathon | Bitcoin Track | $32,000 Prize</em>
</p>