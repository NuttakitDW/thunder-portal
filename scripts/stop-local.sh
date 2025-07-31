#!/bin/bash

echo "Stopping Thunder Portal local environment..."

# Stop Hardhat if running
if [ -f .hardhat.pid ]; then
    PID=$(cat .hardhat.pid)
    if ps -p $PID > /dev/null; then
        echo "Stopping Hardhat (PID: $PID)..."
        kill $PID
    fi
    rm .hardhat.pid
fi

# Stop Docker containers
docker-compose -f docker-compose.local.yml down

echo "✅ Local environment stopped"
