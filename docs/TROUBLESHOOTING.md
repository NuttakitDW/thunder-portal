# Thunder Portal Troubleshooting Guide

This guide helps you resolve common issues when running `make thunder` or setting up Thunder Portal.

## Table of Contents
- [Common Issues](#common-issues)
  - [1. Docker Not Found](#1-docker-not-found)
  - [2. Port Already in Use](#2-port-already-in-use)
  - [3. Dependency Installation Failures](#3-dependency-installation-failures)
  - [4. Bitcoin HTLC Build Errors](#4-bitcoin-htlc-build-errors)
  - [5. Service Health Check Failures](#5-service-health-check-failures)
  - [6. Contract Deployment Errors](#6-contract-deployment-errors)
  - [7. Permission Denied Errors](#7-permission-denied-errors)
  - [8. Network Connectivity Issues](#8-network-connectivity-issues)
- [Diagnostic Commands](#diagnostic-commands)
- [Clean Restart Procedure](#clean-restart-procedure)
- [Platform-Specific Issues](#platform-specific-issues)
- [Getting Help](#getting-help)

## Common Issues

### 1. Docker Not Found

**Symptoms:**
```
⚠️  Docker not found - running demo mode only
```

**Solution:**
1. Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Ensure Docker is running (check the Docker icon in your system tray)
3. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```
4. If using Docker Compose v1 (legacy), ensure it's installed:
   ```bash
   docker-compose --version
   ```

### 2. Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Common ports used by Thunder Portal:**
- 3000: Bitcoin HTLC API
- 3001: Relayer Service
- 3002: Resolver Service
- 8545: Ethereum (Hardhat)
- 18443: Bitcoin Regtest

**Solution:**
1. Check what's using the ports:
   ```bash
   # macOS/Linux
   lsof -i :3000
   lsof -i :3001
   lsof -i :3002
   lsof -i :8545
   lsof -i :18443
   ```

2. Stop conflicting services:
   ```bash
   # Kill processes by port
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   lsof -ti:3002 | xargs kill -9
   lsof -ti:8545 | xargs kill -9
   ```

3. Use the clean command:
   ```bash
   make clean
   make thunder
   ```

### 3. Dependency Installation Failures

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Remove node_modules and lock files:
   ```bash
   rm -rf node_modules package-lock.json
   rm -rf */node_modules */package-lock.json
   ```

3. Install with legacy peer deps flag:
   ```bash
   npm install --legacy-peer-deps
   ```

4. If specific service fails:
   ```bash
   cd evm-resolver && npm install --legacy-peer-deps
   cd ../relayer && npm install --legacy-peer-deps
   cd ../resolver && npm install --legacy-peer-deps
   cd ../thunder-cli && npm install --legacy-peer-deps
   ```

### 4. Bitcoin HTLC Build Errors

**Symptoms:**
```
error: failed to compile `bitcoin-htlc`
error: could not compile `sqlx-macros`
```

**Solution:**
1. Ensure Rust is installed:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. Update Rust:
   ```bash
   rustup update
   ```

3. Install SQLx CLI:
   ```bash
   cargo install sqlx-cli --no-default-features --features sqlite
   ```

4. Clean and rebuild:
   ```bash
   cd bitcoin-htlc
   cargo clean
   make setup
   make build
   ```

5. If SQLx offline mode issues:
   ```bash
   cd bitcoin-htlc
   rm -rf .sqlx
   cargo sqlx prepare
   ```

### 5. Service Health Check Failures

**Symptoms:**
```
❌ Some services failed to start!
❌ Bitcoin HTLC API: Not running
```

**Solution:**
1. Check service logs:
   ```bash
   # Check all logs
   make logs
   
   # Or individual logs
   tail -f logs/bitcoin-htlc.log
   tail -f logs/relayer.log
   tail -f logs/resolver.log
   tail -f logs/hardhat.log
   ```

2. Common log errors and fixes:
   - **"Database not found"**: Run `cd bitcoin-htlc && make setup`
   - **"Cannot find module"**: Run `npm install` in the affected service directory
   - **"Permission denied"**: Check file permissions or run with appropriate privileges

3. Restart individual services:
   ```bash
   # Restart Bitcoin HTLC
   lsof -ti:3000 | xargs kill -9
   cd bitcoin-htlc && cargo run --release > ../logs/bitcoin-htlc.log 2>&1 &
   ```

### 6. Contract Deployment Errors

**Symptoms:**
```
Failed to deploy contracts
Error: insufficient funds for gas
```

**Solution:**
1. Ensure Ethereum node is running:
   ```bash
   curl -s http://localhost:8545
   ```

2. Check if accounts have ETH:
   ```bash
   node scripts/test-local-env.js
   ```

3. Restart Hardhat with fresh state:
   ```bash
   lsof -ti:8545 | xargs kill -9
   cd evm-resolver
   npx hardhat node
   ```

4. Redeploy contracts:
   ```bash
   node scripts/deploy-contracts-simple.js
   ```

### 7. Permission Denied Errors

**Symptoms:**
```
/bin/sh: ./demo/start-full-demo.sh: Permission denied
```

**Solution:**
1. Make scripts executable:
   ```bash
   chmod +x demo/*.sh
   chmod +x scripts/*.sh
   ```

2. If Docker permission issues:
   ```bash
   # Add user to docker group (Linux)
   sudo usermod -aG docker $USER
   newgrp docker
   ```

### 8. Network Connectivity Issues

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:18443
```

**Solution:**
1. Check if Bitcoin container is running:
   ```bash
   docker ps | grep bitcoin
   ```

2. Restart Bitcoin container:
   ```bash
   docker compose restart bitcoin-regtest
   ```

3. Check Docker network:
   ```bash
   docker network ls
   docker network inspect thunder-portal_default
   ```

## Diagnostic Commands

Run these commands to diagnose issues:

```bash
# Check all service status
make status

# Check system resources
df -h  # Disk space
free -m  # Memory (Linux)
top  # CPU usage

# Check Docker status
docker ps
docker compose ps
docker logs thunder-bitcoin-regtest

# Test network connectivity
curl -s http://localhost:3000/v1/health
curl -s http://localhost:3001/health
curl -s http://localhost:3002/health
curl -s http://localhost:8545
```

## Clean Restart Procedure

If nothing else works, try a complete clean restart:

```bash
# 1. Stop everything
make stop

# 2. Clean all data and artifacts
make clean

# 3. Remove Docker volumes
docker compose down -v
docker system prune -af --volumes

# 4. Clear npm cache
npm cache clean --force

# 5. Reinstall and start
make thunder
```

## Platform-Specific Issues

### macOS
- **Apple Silicon (M1/M2)**: Ensure Docker Desktop is using Apple Silicon version
- **Rosetta Issues**: Some dependencies may need Rosetta 2
  ```bash
  softwareupdate --install-rosetta
  ```

### Linux
- **Docker permissions**: Add user to docker group
  ```bash
  sudo usermod -aG docker $USER
  ```
- **SELinux**: May need to adjust policies for Docker

### Windows (WSL2)
- Ensure WSL2 is properly configured
- Docker Desktop must have WSL2 integration enabled
- Use PowerShell or WSL2 terminal, not Git Bash

## Getting Help

If you're still experiencing issues:

1. **Check logs thoroughly**:
   ```bash
   make logs
   ls -la logs/
   ```

2. **Create detailed issue report**:
   - Operating system and version
   - Docker version
   - Node.js version
   - Exact error messages
   - Steps to reproduce

3. **File an issue**: [GitHub Issues](https://github.com/NuttakitDW/thunder-portal/issues)

4. **Community support**: Join our Discord/Telegram for real-time help

## Quick Reference

```bash
# Most common fix sequence
make clean       # Clean everything
make setup       # Install dependencies
make start       # Start services
make status      # Check status

# If specific service fails
cd <service-directory>
npm install --legacy-peer-deps
# or for bitcoin-htlc
cargo build --release
```

Remember: Most issues can be resolved with `make clean` followed by `make thunder`.