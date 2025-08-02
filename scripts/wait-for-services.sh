#!/bin/bash

# Wait for all Thunder Portal services to be healthy

echo "Waiting for services to be healthy..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Maximum wait time (3 minutes)
MAX_WAIT=180
ELAPSED=0

# Function to check service health
check_service() {
    local service_name=$1
    local health_url=$2
    local auth=$3
    
    if [ -n "$auth" ]; then
        curl -s --user "$auth" "$health_url" > /dev/null 2>&1
    else
        curl -s "$health_url" > /dev/null 2>&1
    fi
    
    return $?
}

# Wait for all services
while [ $ELAPSED -lt $MAX_WAIT ]; do
    ALL_HEALTHY=true
    
    # Check Bitcoin
    if ! check_service "Bitcoin" "http://localhost:18443/" "thunderportal:thunderportal123"; then
        ALL_HEALTHY=false
        echo -ne "\r⏳ Waiting for Bitcoin..."
    fi
    
    # Check Ethereum
    if ! check_service "Ethereum" "http://localhost:8545" ""; then
        ALL_HEALTHY=false
        echo -ne "\r⏳ Waiting for Ethereum..."
    fi
    
    # Check Bitcoin HTLC API
    if ! check_service "Bitcoin HTLC" "http://localhost:3000/v1/health" ""; then
        ALL_HEALTHY=false
        echo -ne "\r⏳ Waiting for Bitcoin HTLC API..."
    fi
    
    # Check Relayer
    if ! check_service "Relayer" "http://localhost:3001/health" ""; then
        ALL_HEALTHY=false
        echo -ne "\r⏳ Waiting for Relayer..."
    fi
    
    # Check Resolver
    if ! check_service "Resolver" "http://localhost:3002/health" ""; then
        ALL_HEALTHY=false
        echo -ne "\r⏳ Waiting for Resolver..."
    fi
    
    if [ "$ALL_HEALTHY" = true ]; then
        echo -e "\r${GREEN}✅ All services are healthy!${NC}                    "
        
        # Wait a bit more for contract deployment
        echo "⏳ Waiting for smart contracts to deploy..."
        sleep 15
        
        # Check if deployments exist
        if [ -f "deployments/limit-order-protocol.json" ] && [ -f "deployments/simple-escrow-factory.json" ]; then
            echo -e "${GREEN}✅ Smart contracts deployed!${NC}"
        else
            echo -e "${YELLOW}⚠️  Contract deployment may still be in progress${NC}"
        fi
        
        exit 0
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo -e "\r${RED}❌ Services failed to become healthy after ${MAX_WAIT} seconds${NC}"
echo ""
echo "Check logs with: docker compose logs"
exit 1