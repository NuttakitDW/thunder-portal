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

# Start all services with Docker
start:
	@echo "$(YELLOW)🚀 Starting Thunder Portal services with Docker...$(NC)"
	@docker compose up -d --build
	@./scripts/wait-for-services.sh

# Stop all services
stop:
	@echo "$(YELLOW)🛑 Stopping Thunder Portal services...$(NC)"
	@docker compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

# Stop all services and clean up
clean:
	@echo "$(YELLOW)🧹 Deep cleaning Thunder Portal...$(NC)"
	@echo "1️⃣  Stopping Docker containers..."
	@docker compose down -v
	@echo "2️⃣  Removing Docker images..."
	@docker compose rm -f
	@docker image prune -f
	@echo "3️⃣  Removing old data..."
	@rm -rf data/bitcoin/regtest/* 2>/dev/null || true
	@rm -rf logs/*.log 2>/dev/null || true
	@rm -rf evm-resolver/cache 2>/dev/null || true
	@rm -rf evm-resolver/dist 2>/dev/null || true
	@rm -rf deployments/*.json 2>/dev/null || true
	@rm -rf bitcoin-htlc/data/*.db 2>/dev/null || true
	@echo "$(GREEN)✅ Deep clean complete! Fresh start ready.$(NC)"

# Restart everything fresh
restart: clean start
	@echo "$(GREEN)✅ Fresh restart complete!$(NC)"

# Development helpers
logs:
	@docker compose logs -f

status:
	@echo "$(YELLOW)📊 Service Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(YELLOW)Health Checks:$(NC)"
	@curl -s http://localhost:3000/v1/health > /dev/null && echo "✅ Bitcoin HTLC API: Healthy" || echo "❌ Bitcoin HTLC API: Not responding"
	@curl -s http://localhost:3001/health > /dev/null && echo "✅ Relayer: Healthy" || echo "❌ Relayer: Not responding"
	@curl -s http://localhost:3002/health > /dev/null && echo "✅ Resolver: Healthy" || echo "❌ Resolver: Not responding"
	@curl -s http://localhost:8545 > /dev/null && echo "✅ Ethereum: Healthy" || echo "❌ Ethereum: Not responding"
	@curl -s --user thunderportal:thunderportal123 http://127.0.0.1:18443/ -X POST -d '{"method":"getblockchaininfo"}' > /dev/null 2>&1 && echo "✅ Bitcoin: Healthy" || echo "❌ Bitcoin: Not responding"

# Main command: Beautiful mock demo with UI (Fully Dockerized)
thunder:
	@echo "$(YELLOW)⚡ Starting Thunder Portal with Docker...$(NC)"
	@# Check if Docker is running
	@if ! docker info > /dev/null 2>&1; then \
		echo "$(RED)❌ Docker is not running. Please start Docker first.$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Docker is running$(NC)"
	@# Clean any problematic builds
	@echo "$(YELLOW)🧹 Cleaning Docker build cache...$(NC)"
	@docker compose down 2>/dev/null || true
	@docker system prune -f
	@# Start all services with Docker Compose
	@echo "$(YELLOW)🚀 Starting all Thunder Portal services...$(NC)"
	@docker compose up -d --build --force-recreate
	@echo "$(YELLOW)⏳ Waiting for all services to be healthy...$(NC)"
	@# Wait for all services to be healthy
	@./scripts/wait-for-services.sh || (echo "$(RED)Services failed to start!$(NC)" && exit 1)
	@echo "$(GREEN)✅ All services are running!$(NC)"
	@# Show service status
	@echo ""
	@echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)✅ Thunder Portal is ready!$(NC)"
	@echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Services running:$(NC)"
	@echo "  • Bitcoin Regtest: http://localhost:18443"
	@echo "  • Ethereum: http://localhost:8545"
	@echo "  • Bitcoin HTLC API: http://localhost:3000"
	@echo "  • Relayer: http://localhost:3001"
	@echo "  • Resolver: http://localhost:3002"
	@echo ""
	@echo "$(YELLOW)Starting Thunder CLI demo in 5 seconds...$(NC)"
	@sleep 5
	@# Build and run Thunder CLI locally (not in Docker for interactive mode)
	@cd thunder-cli && npm install > /dev/null 2>&1
	@cd thunder-cli && npm run build > /dev/null 2>&1
	@cd thunder-cli && node dist/cli.js --demo

# Real blockchain swap on testnet
swap-testnet: check-testnet-config
	@./scripts/swap-testnet.sh

# Sepolia contract demo (safe, doesn't modify services)
demo-sepolia:
	@echo "$(YELLOW)🚀 Running Sepolia contract demo...$(NC)"
	@node scripts/demo-sepolia-swap.js

# Show deployed Sepolia contracts
show-contracts:
	@node scripts/show-sepolia-contracts.js

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

