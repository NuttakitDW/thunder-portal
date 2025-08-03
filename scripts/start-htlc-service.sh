#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}⚡ Starting Bitcoin HTLC API Service${NC}"
echo ""

# Check if already running
if curl -s http://localhost:3000/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bitcoin HTLC API is already running on port 3000${NC}"
    exit 0
fi

# Check for Rust
if ! command -v cargo >/dev/null 2>&1; then
    echo -e "${RED}❌ Rust/Cargo not found${NC}"
    echo ""
    echo "Please install Rust first:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo ""
    echo "Or use Docker:"
    echo "  docker compose up -d bitcoin-htlc-api"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Change to bitcoin-htlc directory
cd bitcoin-htlc || {
    echo -e "${RED}❌ bitcoin-htlc directory not found${NC}"
    exit 1
}

# Check if built
if [ ! -f "target/release/bitcoin-htlc" ]; then
    echo -e "${YELLOW}Building Bitcoin HTLC service...${NC}"
    cargo build --release || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
fi

# Start the service
echo -e "${YELLOW}Starting service...${NC}"
cargo run --release > ../logs/bitcoin-htlc.log 2>&1 &
HTLC_PID=$!

# Save PID
echo $HTLC_PID > /tmp/bitcoin-htlc.pid

# Wait for service to be ready
echo -n "Waiting for service to start"
for i in {1..30}; do
    if curl -s http://localhost:3000/v1/health > /dev/null 2>&1; then
        echo -e " ${GREEN}Ready!${NC}"
        echo ""
        echo -e "${GREEN}✅ Bitcoin HTLC API is running${NC}"
        echo "   PID: $HTLC_PID"
        echo "   Port: 3000"
        echo "   Logs: logs/bitcoin-htlc.log"
        echo ""
        echo "To stop the service:"
        echo "  kill $HTLC_PID"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo -e " ${RED}Failed!${NC}"
echo ""
echo "Check logs for errors:"
echo "  tail -f ../logs/bitcoin-htlc.log"
exit 1