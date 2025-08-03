#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}           ⚡ THUNDER PORTAL - TESTNET SWAP SETUP ⚡           ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check service
check_service() {
    local service_name=$1
    local url=$2
    local port=$3
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "✅ $service_name: ${GREEN}Running${NC} (port $port)"
        return 0
    else
        echo -e "❌ $service_name: ${RED}Not running${NC}"
        return 1
    fi
}

# Check environment setup
echo -e "${YELLOW}🔍 Checking environment setup...${NC}"
echo ""

# Check .env.testnet file
if [ ! -f ".env.testnet" ]; then
    echo -e "${RED}❌ Missing .env.testnet file${NC}"
    echo -e "${YELLOW}Creating from template...${NC}"
    cp .env.testnet.example .env.testnet 2>/dev/null || {
        echo -e "${RED}❌ No template found. Please check the documentation.${NC}"
        exit 1
    }
fi

# Check for private keys
if ! grep -q "ETH_RESOLVER_PRIVATE_KEY=" .env.testnet || [ -z "$(grep "ETH_RESOLVER_PRIVATE_KEY=" .env.testnet | cut -d'=' -f2)" ]; then
    echo -e "${RED}❌ Missing private keys in .env.testnet${NC}"
    echo ""
    echo -e "${YELLOW}To add private keys:${NC}"
    echo "1. View test wallets: cat doc/testnet-wallets/wallets-sensitive.json"
    echo "2. Add the private keys to .env.testnet"
    echo ""
    echo "See docs/TESTNET-TROUBLESHOOTING.md for details"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration found${NC}"
echo ""

# Check services
echo -e "${YELLOW}🔍 Checking required services...${NC}"
echo ""

HTLC_RUNNING=false
check_service "Bitcoin HTLC API" "http://localhost:3000/v1/health" "3000" && HTLC_RUNNING=true

# If HTLC is not running, provide options
if [ "$HTLC_RUNNING" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  The Bitcoin HTLC API provides better transaction handling.${NC}"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "1) Start HTLC service now (requires Rust)"
    echo "2) Continue without HTLC service (limited functionality)"
    echo "3) Exit and start manually"
    echo ""
    read -p "Choose option [1-3]: " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            echo -e "${YELLOW}Starting Bitcoin HTLC service...${NC}"
            cd bitcoin-htlc
            if command -v cargo >/dev/null 2>&1; then
                cargo run --release > ../logs/bitcoin-htlc.log 2>&1 &
                echo "Waiting for service to start..."
                sleep 5
                cd ..
                if check_service "Bitcoin HTLC API" "http://localhost:3000/v1/health" "3000"; then
                    HTLC_RUNNING=true
                else
                    echo -e "${RED}Failed to start HTLC service. Check logs/bitcoin-htlc.log${NC}"
                fi
            else
                echo -e "${RED}Rust/Cargo not found. Please install Rust first.${NC}"
                echo "Visit: https://rustup.rs/"
            fi
            ;;
        2)
            echo -e "${YELLOW}Continuing without HTLC service...${NC}"
            ;;
        3)
            echo ""
            echo -e "${CYAN}To start the HTLC service manually:${NC}"
            echo "  cd bitcoin-htlc && make run"
            echo ""
            echo "Then run: make swap-testnet"
            exit 0
            ;;
        *)
            echo "Invalid option"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${YELLOW}🔍 Checking testnet connections...${NC}"
echo ""

# Quick connectivity check
if curl -s https://blockstream.info/testnet/api/blocks/tip/height > /dev/null 2>&1; then
    echo -e "✅ Bitcoin testnet3: ${GREEN}Connected${NC}"
else
    echo -e "❌ Bitcoin testnet3: ${RED}Connection failed${NC}"
fi

if curl -s -X POST https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo -e "✅ Ethereum Sepolia: ${GREEN}Connected${NC}"
else
    echo -e "❌ Ethereum Sepolia: ${RED}Connection failed${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    STARTING TESTNET SWAP                       ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Execute the actual swap
exec node scripts/execute-real-testnet-swap.js