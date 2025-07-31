# Thunder Portal - Bitcoin ⚡ Ethereum Atomic Swaps

Thunder Portal enables trustless atomic swaps between Bitcoin and Ethereum through 1inch Fusion+ integration. No bridges, no wrapped tokens, just pure cryptographic security.

## 🚀 What is Thunder Portal?

A complete implementation that extends 1inch Fusion+ to support Bitcoin, enabling:
- **Trustless Swaps**: Direct BTC ⟷ ETH trades without intermediaries
- **No Bridge Risk**: Uses HTLCs instead of wrapped tokens
- **Professional Liquidity**: Resolver network provides competitive rates
- **Gas-Free**: Users pay zero gas fees (resolvers handle everything)

## 🏗️ Architecture

```
User → 1inch Interface → Thunder Portal Resolver → Bitcoin Network
                      ↓                         ↓
                1inch Contracts ←→ Rust HTLC Service
```

### Core Components

1. **Resolver Service** (TypeScript)
   - Monitors 1inch for Bitcoin swap orders
   - Manages cross-chain coordination
   - Handles Dutch auction participation

2. **HTLC Service** (Rust)
   - Creates and manages Bitcoin HTLCs
   - Provides REST/gRPC APIs
   - Handles transaction building

3. **Smart Integration**
   - No custom contracts needed
   - Uses existing 1inch Settlement infrastructure
   - Fully compatible with Fusion+ ecosystem

## 🔄 How It Works

### ETH → BTC Swap
1. User creates Fusion+ order on 1inch
2. Resolvers compete via Dutch auction
3. Winner creates Bitcoin HTLC
4. User claims BTC with secret
5. Resolver claims ETH atomically

### BTC → ETH Swap
1. User creates Bitcoin HTLC
2. Thunder Portal verifies HTLC
3. Resolver fills with ETH
4. Atomic execution with same secret

## 🛠️ Technical Details

### HTLC Structure
```bitcoin
IF
    OP_HASH256 <secret_hash> OP_EQUALVERIFY
    <recipient_pubkey> OP_CHECKSIG
ELSE
    <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP
    <sender_pubkey> OP_CHECKSIG
ENDIF
```

### Security Model
- **Timeout Hierarchy**: BTC (48h) > ETH (24h)
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

## 🔮 Future Enhancements

- **Lightning Network**: Instant settlements
- **Partial Fills**: Split large orders
- **More Chains**: Extend to other UTXO chains
- **Advanced Routing**: Optimize for best execution

## 📚 Documentation

- **Architecture**: See `/docs/architecture.md`
- **API Reference**: Run service and visit `/api-docs`
- **Integration Guide**: See `/docs/integration.md`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Thunder Portal** - Bringing Bitcoin's $800B to DeFi, trustlessly.