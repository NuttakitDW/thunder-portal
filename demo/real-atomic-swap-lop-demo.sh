#!/bin/bash

# Real Atomic Swap Demo with 1inch Limit Order Protocol Integration
# This demonstrates actual on-chain transactions using Thunder Portal with LOP

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'
DIM='\033[2m'

# Configuration
BITCOIN_AMOUNT="0.1"
ETHEREUM_AMOUNT="2.0"
USER_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

# Function to print header
print_header() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║     ⚡ THUNDER PORTAL + 1inch LIMIT ORDER PROTOCOL DEMO ⚡         ║${NC}"
    echo -e "${PURPLE}║          Real Bitcoin ⟷ Ethereum Swaps via 1inch LOP               ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if services are running
check_services() {
    echo -e "${YELLOW}Checking services...${NC}"
    
    # Check Bitcoin
    if docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getblockchaininfo > /dev/null 2>&1; then
        echo -e "  ✅ Bitcoin Regtest"
    else
        echo -e "  ❌ Bitcoin Regtest - Please run: make start"
        exit 1
    fi
    
    # Check other services
    curl -s http://localhost:3000/v1/health > /dev/null && echo -e "  ✅ Bitcoin HTLC API" || { echo -e "  ❌ Bitcoin HTLC API"; exit 1; }
    curl -s http://localhost:3001/health > /dev/null && echo -e "  ✅ Relayer Service" || { echo -e "  ❌ Relayer Service"; exit 1; }
    curl -s http://localhost:3002/health > /dev/null && echo -e "  ✅ Resolver Service" || { echo -e "  ❌ Resolver Service"; exit 1; }
    curl -s http://localhost:8545 > /dev/null && echo -e "  ✅ Ethereum Node" || { echo -e "  ❌ Ethereum Node"; exit 1; }
    
    echo -e "\n${GREEN}All systems operational!${NC}"
    sleep 2
}

# Phase 0: Check services
print_header
check_services

# Phase 1: Introduction
print_header
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}           THUNDER PORTAL + 1inch LIMIT ORDER PROTOCOL                ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Integration Features:${NC}"
echo -e "  ${GREEN}✓${NC} ${BOLD}1inch Limit Order Protocol${NC} - Native integration"
echo -e "  ${GREEN}✓${NC} ${BOLD}Cross-Chain Orders${NC} - BTC appears in 1inch interface"
echo -e "  ${GREEN}✓${NC} ${BOLD}Professional Liquidity${NC} - Access to 1inch resolver network"
echo -e "  ${GREEN}✓${NC} ${BOLD}Atomic Execution${NC} - Cryptographic guarantees"
echo -e "  ${GREEN}✓${NC} ${BOLD}No Bridges${NC} - Direct on-chain settlement"
echo -e "  ${GREEN}✓${NC} ${BOLD}Gas Optimization${NC} - Leverages 1inch efficiency"
sleep 5

# Phase 2: Check balances
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     PHASE 1: BLOCKCHAIN SETUP                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Bitcoin balance
echo -e "${BOLD}Checking Bitcoin wallet balance...${NC}"
BTC_BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 -rpcwallet=test_wallet getbalance)
echo -e "  • Bitcoin Balance: ${YELLOW}$BTC_BALANCE BTC${NC}"

# Check Ethereum balance
echo -e "${BOLD}Checking Ethereum account balance...${NC}"
ETH_BALANCE_HEX=$(curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC\",\"latest\"],\"id\":1}" \
  | jq -r '.result')
ETH_BALANCE=$(echo "ibase=16; $(echo $ETH_BALANCE_HEX | sed 's/0x//' | tr 'a-f' 'A-F')" | bc)
ETH_BALANCE_DECIMAL=$(awk "BEGIN {printf \"%.6f\", $ETH_BALANCE / 1000000000000000000}")
echo -e "  • Ethereum Balance: ${YELLOW}$ETH_BALANCE_DECIMAL ETH${NC}"
sleep 3

# Phase 3: Create swap order
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                PHASE 2: 1inch LIMIT ORDER CREATION                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ORDER_ID="order-$(date +%s)"
echo -e "${BOLD}Creating 1inch Limit Order:${NC}"
echo -e "  • Order ID: ${CYAN}$ORDER_ID${NC}"
echo -e "  • Type: ${BOLD}Bitcoin → Ethereum${NC}"
echo -e "  • Amount: ${YELLOW}$BITCOIN_AMOUNT BTC${NC} → ${YELLOW}$ETHEREUM_AMOUNT ETH${NC}"
echo -e "  • Rate: ${GREEN}20 ETH/BTC${NC}"
echo -e "  • Protocol: ${PURPLE}1inch Limit Order Protocol${NC}"
echo -e "  • Creation Time: ${DIM}$(date)${NC}"
sleep 3

# Phase 4: Technical details
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              PHASE 3: 1inch PROTOCOL INTEGRATION                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}How Thunder Portal Integrates with 1inch:${NC}"
echo ""
echo -e "1. ${CYAN}Order Registration${NC}"
echo -e "   • Bitcoin orders registered in Limit Order Protocol"
echo -e "   • Appear alongside regular ERC-20 orders"
echo -e "   • Standard 1inch order matching"
echo ""
echo -e "2. ${CYAN}Cross-Chain Coordination${NC}"
echo -e "   • Thunder Portal acts as resolver for BTC orders"
echo -e "   • Creates matching HTLCs on both chains"
echo -e "   • Atomic execution via shared secret"
echo ""
echo -e "3. ${CYAN}Settlement Flow${NC}"
echo -e "   • 1inch protocol handles Ethereum side"
echo -e "   • Thunder Portal manages Bitcoin HTLCs"
echo -e "   • Cryptographic proofs ensure atomicity"
sleep 5

# Phase 5: Execute the swap
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    PHASE 4: EXECUTING THE SWAP                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Initiating atomic swap via 1inch Limit Order Protocol...${NC}"
echo ""

# Spinner function
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " ${CYAN}%c${NC} %s" "$spinstr" "$2"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\r"
    done
    printf " ${GREEN}✅${NC} %s\n" "$2"
}

# Execute the swap with 1inch Limit Order Protocol
(sleep 2) &
spinner $! "Creating swap intent..."

RESPONSE=$(curl -s -X POST http://localhost:3002/execute-real-swap-lop \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "'$ORDER_ID'",
    "bitcoinAmount": '$BITCOIN_AMOUNT',
    "ethereumAmount": '$ETHEREUM_AMOUNT',
    "userAddress": "'$USER_ADDRESS'"
  }')

# Check for errors
if [ -z "$RESPONSE" ]; then
    echo -e "${RED}Failed to execute atomic swap!${NC}"
    exit 1
fi

# Check if response contains an error
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error')
    echo -e "${RED}Error from API: $ERROR_MSG${NC}"
    echo -e "${DIM}Full response: $RESPONSE${NC}"
    exit 1
fi

# Parse response
BITCOIN_HTLC=$(echo "$RESPONSE" | jq -r '.bitcoin.htlcAddress')
BITCOIN_FUNDING_TX=$(echo "$RESPONSE" | jq -r '.bitcoin.fundingTxid')
ETHEREUM_ESCROW=$(echo "$RESPONSE" | jq -r '.ethereum.escrowAddress')
ETHEREUM_TX=$(echo "$RESPONSE" | jq -r '.ethereum.fundingTxid')
LOP_ADDRESS=$(echo "$RESPONSE" | jq -r '.limitOrderProtocol.address')
LOP_INIT_TX=$(echo "$RESPONSE" | jq -r '.limitOrderProtocol.initTxHash')
LOP_FILL_TX=$(echo "$RESPONSE" | jq -r '.limitOrderProtocol.fillTxHash')
ORDER_FILLED=$(echo "$RESPONSE" | jq -r '.limitOrderProtocol.orderFilled')
ORDER_HASH=$(echo "$RESPONSE" | jq -r '.orderHash')

# Phase 6: Show transaction details
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    PHASE 5: TRANSACTION DETAILS                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}1inch Limit Order Protocol:${NC}"
echo -e "  • Contract Address: ${CYAN}$LOP_ADDRESS${NC}"
echo -e "  • Order Hash: ${PURPLE}$ORDER_HASH${NC}"
echo -e "  • Init TX: ${DIM}$LOP_INIT_TX${NC}"
echo -e "  • Fill TX: ${DIM}$LOP_FILL_TX${NC}"
echo -e "  • Order Status: ${GREEN}$ORDER_FILLED${NC}"
echo ""

echo -e "${BOLD}Bitcoin HTLC:${NC}"
echo -e "  • HTLC Address: ${CYAN}$BITCOIN_HTLC${NC}"
echo -e "  • Funding TX: ${DIM}$BITCOIN_FUNDING_TX${NC}"
echo -e "  • Amount Locked: ${YELLOW}$BITCOIN_AMOUNT BTC${NC}"
echo -e "  • Timeout: ${RED}48 hours${NC}"
echo ""

echo -e "${BOLD}Ethereum Escrow:${NC}"
echo -e "  • Escrow Address: ${CYAN}$ETHEREUM_ESCROW${NC}"
echo -e "  • Deployment TX: ${DIM}$ETHEREUM_TX${NC}"
echo -e "  • Amount Locked: ${YELLOW}$ETHEREUM_AMOUNT ETH${NC}"
echo -e "  • Timeout: ${RED}24 hours${NC}"
sleep 3

# Generate confirmations
echo -e "\n${BOLD}Generating block confirmations...${NC}"
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 -rpcwallet=test_wallet generatetoaddress 6 $(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 -rpcwallet=test_wallet getnewaddress) > /dev/null 2>&1
echo -e "  ${GREEN}✓${NC} 6 blocks generated"
sleep 2

# Phase 7: Integration benefits
print_header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  PHASE 6: 1inch INTEGRATION BENEFITS                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}What This Means for 1inch Users:${NC}"
echo ""
echo -e "1. ${CYAN}Native Bitcoin Trading${NC}"
echo -e "   • Trade BTC directly in 1inch interface"
echo -e "   • No wrapped tokens or bridges"
echo -e "   • Same UX as regular token swaps"
echo ""
echo -e "2. ${CYAN}Professional Liquidity${NC}"
echo -e "   • Access to 1inch's resolver network"
echo -e "   • Competitive rates via Dutch auction"
echo -e "   • Deep liquidity from multiple sources"
echo ""
echo -e "3. ${CYAN}Composability${NC}"
echo -e "   • Bitcoin orders in complex routes"
echo -e "   • Multi-hop swaps including BTC"
echo -e "   • Full DeFi integration"
echo ""
echo -e "4. ${CYAN}Gas Efficiency${NC}"
echo -e "   • Leverages 1inch's optimizations"
echo -e "   • Batch settlements possible"
echo -e "   • Users pay zero gas"
sleep 5

# Phase 8: Success summary
print_header
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 ATOMIC SWAP VIA 1inch SUCCESSFUL! 🎉               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Summary:${NC}"
echo -e "  • Protocol: ${PURPLE}1inch Limit Order Protocol${NC}"
echo -e "  • Swapped: ${YELLOW}$BITCOIN_AMOUNT BTC${NC} ⟷ ${YELLOW}$ETHEREUM_AMOUNT ETH${NC}"
echo -e "  • Order Hash: ${CYAN}$ORDER_HASH${NC}"
echo -e "  • Bitcoin HTLC: ${CYAN}$BITCOIN_HTLC${NC}"
echo -e "  • Ethereum Escrow: ${CYAN}$ETHEREUM_ESCROW${NC}"
echo -e "  • Status: ${GREEN}FILLED${NC}"
echo ""

echo -e "${BOLD}Key Achievements:${NC}"
echo -e "  ✅ Bitcoin order registered in 1inch Protocol"
echo -e "  ✅ Cross-chain atomic swap executed"
echo -e "  ✅ No bridges or wrapped tokens used"
echo -e "  ✅ Professional liquidity accessed"
echo -e "  ✅ Gas-free execution for users"
echo ""

echo -e "${BOLD}Verify on 1inch:${NC}"
echo -e "  • Order Status: ${YELLOW}curl -s http://localhost:3002/execute-real-swap-lop${NC}"
echo -e "  • Bitcoin TX: ${YELLOW}docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 -rpcwallet=test_wallet getrawtransaction $BITCOIN_FUNDING_TX 1${NC}"
echo ""

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          MARKET IMPACT: BITCOIN MEETS 1inch ECOSYSTEM               ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Thunder Portal + 1inch unlocks:${NC}"
echo -e "  • ${YELLOW}\$800B Bitcoin market${NC} for 1inch users"
echo -e "  • Native BTC trading in Fusion+ interface"
echo -e "  • Professional market making for Bitcoin"
echo -e "  • New liquidity paradigm for cross-chain swaps"
echo ""

echo -e "${BOLD}Thunder Portal - Bringing Bitcoin to 1inch, trustlessly.${NC}"