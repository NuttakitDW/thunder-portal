# ⚡ Thunder Portal

> Cross-chain atomic swaps bridging 1inch Fusion+ with Bitcoin

Thunder Portal extends 1inch Fusion+ to enable trustless, bidirectional swaps between Ethereum and Bitcoin networks using atomic swap technology.

## 🏆 1inch Unite Hackathon Submission

**Prize Track:** Extend Fusion+ to Bitcoin (Doge/LTC/etc.) - $32,000

## 🎯 Project Overview

Thunder Portal is a non-custodial cross-chain bridge that brings Bitcoin support to 1inch Fusion+. By implementing a custom resolver that coordinates between Fusion+'s intent-based swaps and Bitcoin's atomic swap capabilities, we enable seamless ETH ↔ BTC exchanges while preserving all security guarantees.

### Key Features

- ⚡ **Bidirectional Swaps**: ETH → BTC and BTC → ETH
- 🔒 **Non-Custodial**: Atomic swaps ensure trustless execution
- ⏱️ **Hashlock/Timelock**: Full HTLC implementation for security
- 🌉 **Fusion+ Integration**: Seamless extension of existing protocol
- 📊 **On-chain Settlement**: Transparent, verifiable transactions

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Wallet   │     │  Thunder Portal  │     │   Bitcoin       │
│   (ETH/ERC20)   │ <-> │    Resolver      │ <-> │   Network       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         |                        |                         |
         v                        v                         v
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1inch Fusion+   │     │  Coordination    │     │   Atomic Swap   │
│     Protocol    │     │     Engine       │     │  Infrastructure │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- Bitcoin Core or compatible node
- Ethereum RPC endpoint
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/[your-username]/thunder-portal.git
cd thunder-portal

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run tests
npm test

# Start the resolver
npm start
```

## 🔧 Technical Implementation

### Core Components

1. **Fusion+ Monitor**: Watches for cross-chain swap intents
2. **Atomic Swap Engine**: Manages HTLC creation and execution
3. **Resolver Logic**: Coordinates between Ethereum and Bitcoin
4. **Safety Module**: Handles timeouts and failure scenarios

### Swap Flow

1. User creates swap intent on Fusion+
2. Thunder Portal resolver detects and evaluates the order
3. Atomic swap is initiated with matching hashlocks
4. Bidirectional execution with automatic rollback on failure
5. Successful completion unlocks funds on both chains

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test on testnet
npm run demo:testnet
```

## 🎮 Demo

For the hackathon demo, we'll showcase:

1. **ETH → BTC Swap**: Live mainnet/testnet execution
2. **BTC → ETH Swap**: Reverse direction demonstration
3. **Failure Handling**: Timeout and refund mechanisms
4. **Performance**: Sub-minute cross-chain execution

## 🛣️ Roadmap

- [x] Research and design architecture
- [x] Implement atomic swap primitives
- [ ] Build Fusion+ integration
- [ ] Create resolver logic
- [ ] Add safety mechanisms
- [ ] Deploy to testnet
- [ ] Prepare demo
- [ ] Submit to hackathon

## 👥 Team

- **Developer**: [Your Name]
- **Contact**: [Your Contact]

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- 1inch team for Fusion+ protocol
- Bitcoin community for atomic swap standards
- Hackathon organizers and mentors

---

Built with ⚡ for the 1inch Unite Hackathon