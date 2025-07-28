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

## 💡 Innovation

**Thunder Portal is the atomic swap resolver for 1inch Fusion+** - enabling trustless Bitcoin integration with zero custody risk.

**How we solved it:**
1. **Unified Hash Coordination** - Same cryptographic secret controls both chains
2. **Intent-to-HTLC Bridge** - Fusion+ intents trigger Bitcoin HTLCs automatically  
3. **Timeout Hierarchy** - Bitcoin timeout > Ethereum timeout prevents attacks
4. **Resolver Network** - Professional market makers provide liquidity

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/thunder-portal/thunder-portal.git
cd thunder-portal

# Configure
cp .env.example .env
# Add your Bitcoin node and Ethereum RPC

# Build and run
make build         # Build all services
make run-api       # Run Bitcoin HTLC API (Rust)
make run-resolver  # Run Fusion+ resolver
```

## 📊 Comparison

| | Thunder Portal | WBTC | Traditional Bridges |
|----------|---------------|------|--------------------|
| **Trust** | Trustless | BitGo Custody | Bridge Operators |
| **Asset** | Native BTC | Wrapped Token | Wrapped Token |
| **Security** | Atomic Swaps | Custody Risk | Bridge Hacks |
| **1inch Support** | ✅ Native | ❌ No | ❌ No |



## 👥 Team

- **[Nuttakit DW](https://github.com/NuttakitDW)** - Blockchain Enthusiast | Rust, Solidity, Circom, Noir-Lang, Risc0
- **[Kongphop Kingpeth](https://github.com/JFKongphop)** - Financial Engineering student with expertise in Blockchain and Full-Stack development
- **[Yuttakhan B.](https://github.com/badgooooor)** - 📸 No talking just straight to the action | [yuttakhanb.dev](https://yuttakhanb.dev)

---

<p align="center">
  <strong>⚡ Thunder Portal - Bringing Bitcoin to DeFi</strong><br>
  <em>1inch Unite Hackathon | Bitcoin Track | $32,000 Prize</em>
</p>