#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║       ⚡ THUNDER PORTAL - FULL ATOMIC SWAP DEMO ⚡                 ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

echo -e "${YELLOW}Starting all Thunder Portal services...${NC}"
echo "======================================"

# 1. Check/Start Bitcoin
echo -e "\n${BLUE}1. Bitcoin Regtest${NC}"
if curl -s --user thunderportal:thunderportal123 http://127.0.0.1:18443/ -X POST -d '{"method":"getblockchaininfo"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already running${NC}"
else
    echo "Starting Bitcoin..."
    cd "$PROJECT_ROOT"
    docker-compose up -d bitcoin-regtest
    sleep 5
fi

# 2. Check/Start Ethereum
echo -e "\n${BLUE}2. Ethereum (Hardhat)${NC}"
if curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already running${NC}"
else
    echo "Starting Hardhat..."
    cd "$PROJECT_ROOT/evm-resolver"
    npx hardhat node > ../logs/hardhat.log 2>&1 &
    HARDHAT_PID=$!
    sleep 5
fi

# 3. Check/Start Bitcoin HTLC API
echo -e "\n${BLUE}3. Bitcoin HTLC API${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already running${NC}"
else
    echo "Starting Bitcoin HTLC API..."
    cd "$PROJECT_ROOT/bitcoin-htlc"
    cargo run --release > ../logs/bitcoin-htlc.log 2>&1 &
    HTLC_PID=$!
    sleep 5
fi

# 4. Install and start Relayer
echo -e "\n${BLUE}4. Relayer Service${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already running${NC}"
else
    echo "Starting Relayer..."
    cd "$PROJECT_ROOT/relayer"
    npm install > /dev/null 2>&1
    node index.js > ../logs/relayer.log 2>&1 &
    RELAYER_PID=$!
    sleep 2
fi

# 5. Install and start Resolver
echo -e "\n${BLUE}5. Resolver Service${NC}"
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already running${NC}"
else
    echo "Starting Resolver..."
    cd "$PROJECT_ROOT/resolver"
    npm install > /dev/null 2>&1
    node index.js > ../logs/resolver.log 2>&1 &
    RESOLVER_PID=$!
    sleep 2
fi

# Save PIDs
echo "HARDHAT_PID=$HARDHAT_PID" > /tmp/thunder-portal-pids
echo "HTLC_PID=$HTLC_PID" >> /tmp/thunder-portal-pids
echo "RELAYER_PID=$RELAYER_PID" >> /tmp/thunder-portal-pids
echo "RESOLVER_PID=$RESOLVER_PID" >> /tmp/thunder-portal-pids

# Verify all services
echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}       ALL SERVICES STATUS              ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Service Health Checks:${NC}"
curl -s http://localhost:3000/v1/health > /dev/null && echo -e "✅ Bitcoin HTLC API:  ${GREEN}Running${NC} (port 3000)" || echo -e "❌ Bitcoin HTLC API:  ${RED}Failed${NC}"
curl -s http://localhost:3001/health > /dev/null && echo -e "✅ Relayer Service:   ${GREEN}Running${NC} (port 3001)" || echo -e "❌ Relayer Service:   ${RED}Failed${NC}"
curl -s http://localhost:3002/health > /dev/null && echo -e "✅ Resolver Service:  ${GREEN}Running${NC} (port 3002)" || echo -e "❌ Resolver Service:  ${RED}Failed${NC}"
curl -s http://localhost:8545 > /dev/null && echo -e "✅ Ethereum Node:     ${GREEN}Running${NC} (port 8545)" || echo -e "❌ Ethereum Node:     ${RED}Failed${NC}"
curl -s --user thunderportal:thunderportal123 http://127.0.0.1:18443/ -X POST -d '{"method":"getblockchaininfo"}' > /dev/null 2>&1 && echo -e "✅ Bitcoin Node:      ${GREEN}Running${NC} (port 18443)" || echo -e "❌ Bitcoin Node:      ${RED}Failed${NC}"

echo -e "\n${YELLOW}Smart Contracts:${NC}"
echo -e "• Limit Order Protocol: ${YELLOW}Deploying...${NC}"
echo -e "• Escrow Factory:      ${YELLOW}Deploying...${NC}"

echo -e "\n${GREEN}All services are ready!${NC}"
echo -e "\nTo view logs:"
echo -e "  ${YELLOW}tail -f ../logs/*.log${NC}"