#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Stopping ALL Thunder Portal Services...${NC}"
echo "======================================"

# Load PIDs if available
if [ -f /tmp/thunder-portal-pids ]; then
    source /tmp/thunder-portal-pids
fi

# 1. Stop Rust API
echo -e "\n${YELLOW}Stopping Bitcoin HTLC API...${NC}"
if [ -n "$RUST_PID" ]; then
    kill $RUST_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}Already stopped${NC}"
else
    pkill -f "thunder-portal" 2>/dev/null
fi

# 2. Stop Hardhat
echo -e "\n${YELLOW}Stopping Ethereum node...${NC}"
if [ -n "$HARDHAT_PID" ]; then
    kill $HARDHAT_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}Already stopped${NC}"
else
    pkill -f "hardhat node" 2>/dev/null
fi

# 3. Stop Bitcoin
echo -e "\n${YELLOW}Stopping Bitcoin regtest...${NC}"
cd /Users/nuttakit/project/unite/unite-agent/thunder-portal
docker-compose down
echo -e "${GREEN}✅ Stopped${NC}"

# Clean up
rm -f /tmp/thunder-portal-pids

echo -e "\n${GREEN}All services stopped!${NC}"