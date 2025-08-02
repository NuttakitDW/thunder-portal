# Thunder Portal Demo Makefile
# Focused on hackathon demo success

.PHONY: setup start stop clean restart help all thunder swap-testnet

# Default target
all: help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
CYAN := \033[0;36m
RED := \033[0;31m
NC := \033[0m # No Color

# Show available commands
help:
	@echo "$(GREEN)⚡ Thunder Portal Commands:$(NC)"
	@echo ""
	@echo "$(YELLOW)Main Commands:$(NC)"
	@echo "  make thunder      - Mock demo with beautiful UI (recommended)"
	@echo "  make swap-testnet - Real blockchain swap (BTC testnet ⟷ ETH Sepolia)"
	@echo ""
	@echo "$(CYAN)Supporting Commands:$(NC)"
	@echo "  make setup        - Install all dependencies"
	@echo "  make start        - Start all services"
	@echo "  make stop         - Stop all services"
	@echo "  make clean        - Clean everything and reset"
	@echo "  make restart      - Stop, clean, and start fresh"
	@echo "  make status       - Check service status"
	@echo "  make logs         - View service logs"
	@echo "  make balances - Check all testnet wallet balances"

# Setup dependencies and environment
setup:
	@echo "$(YELLOW)📦 Setting up Thunder Portal environment...$(NC)"
	@echo "1️⃣  Installing Node dependencies..."
	@cd evm-resolver && npm install
	@cd relayer && npm install
	@cd resolver && npm install
	@cd thunder-cli && npm install
	@echo "2️⃣  Setting up Bitcoin HTLC service..."
	@cd bitcoin-htlc && make setup
	@echo "2️⃣  Building Bitcoin HTLC service..."
	@cd bitcoin-htlc && make build
	@echo "3️⃣  Building Thunder CLI..."
	@cd thunder-cli && npm run build
	@echo "4️⃣  Creating necessary directories..."
	@mkdir -p logs data/bitcoin/regtest
	@echo "$(GREEN)✅ Setup complete!$(NC)"

# Start all services
start:
	@echo "$(YELLOW)🚀 Starting Thunder Portal services...$(NC)"
	@./demo/start-full-demo.sh
	@sleep 5
	@echo ""
	@echo "$(YELLOW)📜 Deploying smart contracts...$(NC)"
	@echo "1️⃣  Deploying 1inch Limit Order Protocol..."
	@npx hardhat run scripts/deploy-limit-order-protocol.js --network localhost 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo "2️⃣  Deploying SimpleEscrowFactory contract..."
	@npx hardhat run scripts/deploy-simple-escrow-factory.js --network localhost 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo "3️⃣  Deploying Thunder Portal contracts..."
	@cd evm-resolver && ./scripts/deploy-with-forge.sh 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo ""
	@echo "$(YELLOW)🔄 Restarting services with new contract...$(NC)"
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@cd relayer && node index.js > ../logs/relayer.log 2>&1 &
	@cd resolver && node index.js > ../logs/resolver.log 2>&1 &
	@sleep 3
	@echo ""
	@# Check if all services are actually running
	@# Wait a moment for resolver to restart
	@sleep 2
	@if curl -s http://localhost:3000/v1/health > /dev/null 2>&1 && \
	    curl -s http://localhost:3001/health > /dev/null 2>&1 && \
	    curl -s http://localhost:3002/health > /dev/null 2>&1 && \
	    curl -s http://localhost:8545 > /dev/null 2>&1; then \
		echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"; \
		echo "$(GREEN)✅ Thunder Portal is ready!$(NC)"; \
		echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Contracts deployed:$(NC)"; \
		echo "  • Limit Order Protocol: $(GREEN)$$(cat deployments/limit-order-protocol.json 2>/dev/null | jq -r '.limitOrderProtocol' || echo "Check deployment")$(NC)"; \
		echo "  • Simple Escrow Factory: $(GREEN)$$(cat deployments/simple-escrow-factory.json 2>/dev/null | jq -r '.contracts.SimpleEscrowFactory.address' || echo "Check deployment")$(NC)"; \
		echo "  • Cross-Chain Factory:   $(GREEN)$$(cat evm-resolver/deployments/simple-escrow-factory-local.json 2>/dev/null | grep -o '"address": "[^"]*"' | head -1 | cut -d'"' -f4 || echo "Check deployment")$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Ready to run:$(NC)"; \
		echo "  $(GREEN)make thunder$(NC) - Beautiful mock demo with UI"; \
		echo "  $(GREEN)make swap-testnet$(NC) - Real blockchain swap (coming soon)"; \
	else \
		echo "$(RED)════════════════════════════════════════════════════════════$(NC)"; \
		echo "$(RED)❌ Some services failed to start!$(NC)"; \
		echo "$(RED)════════════════════════════════════════════════════════════$(NC)"; \
		echo ""; \
		make status; \
		echo ""; \
		echo "$(YELLOW)Troubleshooting:$(NC)"; \
		echo "  1. Check logs: $(GREEN)make logs$(NC)"; \
		echo "  2. Try restarting: $(GREEN)make restart$(NC)"; \
		echo "  3. Check Bitcoin HTLC build: $(GREEN)cd bitcoin-htlc && cargo build --release$(NC)"; \
		exit 1; \
	fi

# Stop all services
stop:
	@echo "$(YELLOW)🛑 Stopping Thunder Portal services...$(NC)"
	@./demo/stop-all-services.sh 2>/dev/null || true
	@pkill -f "node.*relayer" 2>/dev/null || true
	@pkill -f "node.*resolver" 2>/dev/null || true
	@pkill -f "hardhat node" 2>/dev/null || true
	@pkill -f "thunder-portal" 2>/dev/null || true
	@lsof -ti:3000-3002,8545 | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✅ Services stopped$(NC)"

# Stop all services and clean up
clean:
	@echo "$(YELLOW)🧹 Deep cleaning Thunder Portal...$(NC)"
	@echo "1️⃣  Stopping all services..."
	@./demo/stop-all-services.sh 2>/dev/null || true
	@pkill -f "node.*relayer" 2>/dev/null || true
	@pkill -f "node.*resolver" 2>/dev/null || true
	@pkill -f "hardhat node" 2>/dev/null || true
	@pkill -f "thunder-portal" 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8545 | xargs kill -9 2>/dev/null || true
	@echo "2️⃣  Stopping Docker containers..."
	@docker-compose down -v 2>/dev/null || true
	@docker rm -f thunder-bitcoin-regtest 2>/dev/null || true
	@echo "3️⃣  Removing old data..."
	@rm -rf data/bitcoin/regtest/* 2>/dev/null || true
	@rm -rf logs/*.log 2>/dev/null || true
	@rm -rf evm-resolver/cache 2>/dev/null || true
	@rm -rf evm-resolver/dist 2>/dev/null || true
	@rm -rf evm-resolver/deployments/*.json 2>/dev/null || true
	@rm -rf deployments/*.json 2>/dev/null || true
	@rm -rf bitcoin-htlc/data/*.db 2>/dev/null || true
	@rm -f relayer/index.js.bak 2>/dev/null || true
	@echo "4️⃣  Cleaning build artifacts..."
	@cd bitcoin-htlc && cargo clean 2>/dev/null || true
	@echo "$(GREEN)✅ Deep clean complete! Fresh start ready.$(NC)"

# Restart everything fresh
restart: clean start
	@echo "$(GREEN)✅ Fresh restart complete!$(NC)"

# Development helpers
logs:
	@tail -f logs/*.log

status:
	@echo "$(YELLOW)📊 Service Status:$(NC)"
	@curl -s http://localhost:3000/v1/health > /dev/null && echo "✅ Bitcoin HTLC API: Running" || echo "❌ Bitcoin HTLC API: Not running"
	@curl -s http://localhost:3001/health > /dev/null && echo "✅ Relayer: Running" || echo "❌ Relayer: Not running"
	@curl -s http://localhost:3002/health > /dev/null && echo "✅ Resolver: Running" || echo "❌ Resolver: Not running"
	@curl -s http://localhost:8545 > /dev/null && echo "✅ Ethereum: Running" || echo "❌ Ethereum: Not running"
	@curl -s --user thunderportal:thunderportal123 http://127.0.0.1:18443/ -X POST -d '{"method":"getblockchaininfo"}' > /dev/null 2>&1 && echo "✅ Bitcoin: Running" || echo "❌ Bitcoin: Not running"

# Main command: Beautiful mock demo with UI
thunder: setup start
	@echo "$(YELLOW)⚡ Thunder Portal is ready!$(NC)"
	@echo "Starting Thunder CLI demo in 5 seconds..."
	@sleep 5
	@echo "$(YELLOW)⚡ Starting Thunder Portal CLI in demo mode...$(NC)"
	@echo "$(GREEN)Demo mode showcases the beautiful UI with mock transactions$(NC)"
	@cd thunder-cli && npm run build > /dev/null 2>&1
	@cd thunder-cli && node dist/cli.js --demo

# Real blockchain swap on testnet
swap-testnet: check-testnet-config
	@./scripts/swap-testnet.sh

# Setup testnet configuration
setup-testnet:
	@echo "$(YELLOW)🔧 Setting up testnet configuration...$(NC)"
	@./scripts/setup-testnet-config.sh

# Check testnet configuration
check-testnet-config:
	@if [ ! -f "bitcoin-htlc/.env" ] || [ ! -f "resolver/.env" ] || [ ! -f "relayer/.env" ]; then \
		echo "$(RED)❌ Testnet configuration not found$(NC)"; \
		echo "$(YELLOW)Running setup...$(NC)"; \
		./scripts/setup-testnet-config.sh; \
	fi

# Check all testnet wallet balances
balances:
	@echo "$(YELLOW)💰 Checking Thunder Portal testnet wallet balances...$(NC)"
	@node scripts/check-testnet-balances.js

