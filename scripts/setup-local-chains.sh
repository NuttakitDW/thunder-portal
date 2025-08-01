#!/bin/bash

echo "⚡ Thunder Portal - Local Blockchain Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Parse command line arguments
BITCOIN_ONLY=false
ETHEREUM_ONLY=false
USE_HARDHAT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --bitcoin-only)
      BITCOIN_ONLY=true
      shift
      ;;
    --ethereum-only)
      ETHEREUM_ONLY=true
      shift
      ;;
    --use-hardhat)
      USE_HARDHAT=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --bitcoin-only    Setup only Bitcoin regtest"
      echo "  --ethereum-only   Setup only Ethereum local network"
      echo "  --use-hardhat     Use Hardhat instead of Anvil for Ethereum"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check prerequisites
print_section "Checking Prerequisites"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi
print_status "Docker is running"

# Check Ethereum tooling
if [ "$ETHEREUM_ONLY" = true ] || [ "$BITCOIN_ONLY" = false ]; then
    if [ "$USE_HARDHAT" = true ]; then
        if [ ! -d "node_modules" ]; then
            print_status "Installing Node.js dependencies..."
            npm install
        fi
        print_status "Hardhat dependencies available"
    else
        if ! command -v anvil &> /dev/null; then
            print_error "Anvil (Foundry) is not installed."
            echo "Install it with: curl -L https://foundry.paradigm.xyz | bash && source ~/.bashrc && foundryup"
            exit 1
        fi
        print_status "Anvil (Foundry) is available"
    fi
fi

# Create necessary directories
mkdir -p logs data/bitcoin

# Setup Bitcoin Regtest
if [ "$ETHEREUM_ONLY" = false ]; then
    print_section "Setting up Bitcoin Regtest"
    
    # Check if port is in use
    if lsof -Pi :18443 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 18443 is already in use. Stopping existing Bitcoin service..."
        docker stop thunder-bitcoin-regtest 2>/dev/null || true
        docker rm thunder-bitcoin-regtest 2>/dev/null || true
    fi
    
    # Run Bitcoin setup script
    ./scripts/setup-bitcoin-regtest.sh
    if [ $? -ne 0 ]; then
        print_error "Bitcoin regtest setup failed"
        exit 1
    fi
fi

# Setup Ethereum
if [ "$BITCOIN_ONLY" = false ]; then
    print_section "Setting up Ethereum Local Network"
    
    # Check if port is in use
    if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 8545 is already in use. Stopping existing Ethereum service..."
        # Stop existing processes
        if [ -f ".hardhat.pid" ]; then
            kill $(cat .hardhat.pid) 2>/dev/null || true
            rm .hardhat.pid
        fi
        if [ -f ".anvil.pid" ]; then
            kill $(cat .anvil.pid) 2>/dev/null || true
            rm .anvil.pid
        fi
        pkill -f "anvil" || true
        pkill -f "hardhat node" || true
        sleep 2
    fi
    
    if [ "$USE_HARDHAT" = true ]; then
        print_status "Starting Hardhat local network..."
        npx hardhat node > logs/hardhat.log 2>&1 &
        HARDHAT_PID=$!
        echo $HARDHAT_PID > .hardhat.pid
        sleep 5
        
        # Test connection
        if curl -s -X POST http://localhost:8545 \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
            print_status "Hardhat network is running!"
        else
            print_error "Hardhat failed to start. Check logs/hardhat.log"
            exit 1
        fi
    else
        ./scripts/setup-anvil.sh
        if [ $? -ne 0 ]; then
            print_error "Anvil setup failed"
            exit 1
        fi
    fi
fi

# Create environment configuration
print_section "Creating Environment Configuration"

cat > .env.local << 'EOF'
# Thunder Portal Local Development Environment
# Generated automatically - modify as needed

# Ethereum Configuration
ETHEREUM_RPC_URL=http://localhost:8545
ETHEREUM_CHAIN_ID=31337

# Bitcoin Configuration  
BITCOIN_RPC_URL=http://localhost:18443
BITCOIN_RPC_USER=thunderportal
BITCOIN_RPC_PASSWORD=thunderportal123
BITCOIN_NETWORK=regtest

# Database
DATABASE_URL=sqlite://thunder_portal_local.db

# API Keys (for testing)
API_KEY=demo-key-123

# Service Ports
BITCOIN_HTLC_PORT=3000
RELAYER_PORT=3001
RESOLVER_PORT=3002
EOF

print_status "Environment configuration created: .env.local"

# Summary
print_section "Setup Complete!"
echo ""
if [ "$BITCOIN_ONLY" = false ] && [ "$ETHEREUM_ONLY" = false ]; then
    echo "🎯 Both Bitcoin and Ethereum networks are running:"
elif [ "$BITCOIN_ONLY" = true ]; then
    echo "🎯 Bitcoin regtest network is running:"
elif [ "$ETHEREUM_ONLY" = true ]; then
    echo "🎯 Ethereum local network is running:"
fi

if [ "$BITCOIN_ONLY" = false ]; then
    if [ "$USE_HARDHAT" = true ]; then
        echo "  • Ethereum (Hardhat): http://localhost:8545"
    else
        echo "  • Ethereum (Anvil): http://localhost:8545"
    fi
fi

if [ "$ETHEREUM_ONLY" = false ]; then
    echo "  • Bitcoin Regtest: http://localhost:18443"
fi

echo ""
echo "📄 Configuration: .env.local"
echo "📝 Logs: logs/ directory"
echo ""
echo "🚀 Next Steps:"
echo "  1. Deploy smart contracts: npm run deploy:local"
echo "  2. Start Thunder Portal services: npm start"
echo "  3. Test the setup: npm run test:env"
echo ""
echo "🛑 To stop all services: ./scripts/stop-local-chains.sh"