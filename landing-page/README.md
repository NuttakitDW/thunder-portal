**Hackathon Demo**: 
Trustless atomic swaps between Bitcoin and Ethereum. No bridges, no wrapped tokens, just cryptographic guarantees.

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

## 🔧 Troubleshooting

For comprehensive troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

### Common Issues

#### 1. `make thunder` fails with "Cannot find module 'hardhat'"

**Problem**: Root dependencies not installed.

**Solution**: The Makefile has been updated to automatically install root dependencies. If you encounter this issue on an older version:

```bash
# Install root dependencies manually
npm install --legacy-peer-deps

# Then run make thunder
make thunder
```

**Root Cause**: The project has dependencies in both the root directory and subdirectories. The `--legacy-peer-deps` flag is needed due to ethers v5/v6 compatibility issues with hardhat tooling.

#### 2. Port already in use errors

**Problem**: Services from previous runs still running.

**Solution**:
```bash
# Stop all services
make stop

# Or for a complete cleanup
make clean
make thunder
```

#### 3. Docker not found

**Problem**: Docker is not installed or not running.

**Solution**: Thunder Portal will run in demo mode without Docker, showing the UI with mock transactions. For full functionality, install Docker from [docker.com](https://docker.com).

#### 4. Build failures in bitcoin-htlc

**Problem**: Rust or build dependencies missing.

**Solution**:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Rebuild bitcoin-htlc
cd bitcoin-htlc
cargo build --release
```

**Thunder Portal** - Trustless Bitcoin DeFi is Here ⚡