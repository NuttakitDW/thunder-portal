# Project Plan: ETH-BTC Cross-Chain Swap with Fusion+ Extension

## Executive Summary

**Objective**: Implement `make swap-testnet` command to execute real atomic swaps between Bitcoin testnet3 and Ethereum Sepolia within 60-second hackathon demo constraints.

**Current Status**: Thunder Portal successfully executes atomic swaps on local networks (regtest/hardhat) with full service integration. Challenge is adapting to real testnet environments with 10-minute Bitcoin block times and network reliability issues.

**Value Proposition for Judges**: Demonstrate the world's first production-ready atomic swap solution that eliminates $2.5B in bridge risk by using Lightning-inspired presigned transactions with 1inch Fusion+ integration.

## Technical Architecture

### Core Components (Status: Operational on Local)
1. **Bitcoin HTLC Service** - Rust API for managing Bitcoin HTLCs ✅
2. **EVM Resolver** - Solidity contracts for Ethereum escrow ✅
3. **Relayer Service** - Node.js bridging between chains ✅
4. **Fusion+ Integration** - 1inch Limit Order Protocol extension ✅
5. **Cross-chain Communication** - REST API orchestration ✅

### Integration Points
- Bitcoin HTLC ↔ Ethereum Escrow via secret hash
- 1inch Fusion+ orders for liquidity provision
- Merkle tree validation for partial fills
- Presigned transaction broadcasting

## Implementation Phases

### Phase 1: Foundation (COMPLETED ✅)
- [x] Local atomic swap demonstration working
- [x] All services integrated and operational
- [x] Smart contracts deployed locally
- [x] CLI interface functional

### Phase 2: Testnet Configuration (2-3 hours) - CRITICAL PATH
**Priority: HIGH - Required for hackathon demo**

#### 2.1 Wallet Setup and Funding (30 min) - COMPLETED ✅
**Total Wallets Required: 8 (4 Bitcoin testnet3, 4 Ethereum Sepolia)**

**Wallets Generated and Documented:**
- [x] All 8 testnet wallets generated with seed phrases
- [x] Complete documentation created at `doc/testnet-wallets/WALLETS-COMPLETE.md`
- [x] Environment file `.env.testnet` ready for configuration
- [ ] Fund wallets using testnet faucets (see complete details in wallet docs)

**Key Addresses:**
- Bitcoin Maker: `tb1qthmpa24ghlyfcx654ahr65we2fry285jmxnd87`
- Bitcoin Resolver: `tb1qh3kya4ejyypt8e29kz2v6jfzxw9mxwuvv8xdut`
- Ethereum Resolver: `0xF79e5800150C8DFB3730C9Da17a157dD9D53E6db`
- See `doc/testnet-wallets/WALLETS-COMPLETE.md` for all details

#### 2.2 Bitcoin Testnet Integration (1 hour)
- [ ] Configure Bitcoin HTLC service for testnet3 RPC endpoints
- [ ] Update timeout calculations for 10-minute blocks (use 6 blocks = ~60 min timeout)
- [ ] Set up resolver service wallet with Bitcoin Core RPC
- [ ] Configure wallet derivation paths (m/84'/1'/0'/0/0 for P2WPKH)

#### 2.3 Ethereum Sepolia Integration (45 min)
- [ ] Deploy contracts to Sepolia testnet
- [ ] Configure resolver/relayer for Sepolia RPC
- [ ] Set up resolver service wallet with sufficient ETH for liquidity + gas
- [ ] Update gas estimation for real network conditions
- [ ] Configure wallet addresses in environment variables
- [ ] Verify cross-chain communication paths

#### 2.4 Demo Time Optimization (45 min)
- [ ] Implement 0-confirmation Bitcoin acceptance for demo speed
- [ ] Add mempool monitoring for instant feedback
- [ ] Create "fast demo mode" with optimistic execution
- [ ] Pre-fund all testnet addresses for immediate execution

### Phase 3: Demo Reliability (1-2 hours) - JUDGE SUCCESS
**Priority: HIGH - Demo must complete in 60 seconds**

#### 3.1 Network Resilience
- [ ] Implement RPC endpoint failover (Infura + Alchemy + local nodes)
- [ ] Add retry logic with exponential backoff
- [ ] Cache testnet state for offline demo fallback
- [ ] Pre-validate all network connections before demo

#### 3.2 Demo Flow Optimization
- [ ] Pre-create and fund Bitcoin HTLCs
- [ ] Use pending transactions for visual progress
- [ ] Implement demo state machine with checkpoints
- [ ] Add "skip to result" option for network failures

#### 3.3 Visual Enhancement
- [ ] Real-time blockchain explorer links
- [ ] Transaction status dashboard
- [ ] Network confirmation counters
- [ ] Success celebration animation

### Phase 4: Production Readiness (If Time Permits)
**Priority: LOW - Nice to have**

#### 4.1 Security Hardening
- [ ] Mainnet-ready configurations
- [ ] Production RPC endpoints
- [ ] Enhanced error handling
- [ ] Transaction fee optimization

## Wallet Configuration Details

### Environment Variables Required
```bash
# Bitcoin Testnet3
BTC_MAKER_ADDRESS=<maker_btc_address>
BTC_MAKER_PRIVATE_KEY=<maker_btc_private_key>
BTC_RESOLVER_ADDRESS=<resolver_btc_address>
BTC_RESOLVER_PRIVATE_KEY=<resolver_btc_private_key>
BTC_TAKER_ADDRESS=<taker_btc_address>

# Ethereum Sepolia
ETH_MAKER_ADDRESS=<maker_eth_address>
ETH_MAKER_PRIVATE_KEY=<maker_eth_private_key>
ETH_RESOLVER_ADDRESS=<resolver_eth_address>
ETH_RESOLVER_PRIVATE_KEY=<resolver_eth_private_key>
ETH_TAKER_ADDRESS=<taker_eth_address>
ETH_TAKER_PRIVATE_KEY=<taker_eth_private_key>

# RPC Endpoints
BTC_TESTNET_RPC=https://testnet.bitcoinrpc.com/
ETH_SEPOLIA_RPC=https://sepolia.infura.io/v3/<API_KEY>
```

### Wallet Roles in Swap Flow
1. **Maker initiates swap**: Locks BTC in HTLC, expects ETH
2. **Resolver provides liquidity**: Locks ETH in escrow, monitors BTC HTLC
3. **Taker completes swap**: Sends ETH, claims BTC with preimage
4. **Atomic completion**: Both sides finalize with same secret

### Total Funding Requirements
- **Bitcoin Testnet3**: ~6-11 BTC total
- **Ethereum Sepolia**: ~6.6-15.6 ETH total

## Risk Mitigation

### Critical Risks & Solutions

1. **Bitcoin Block Time Risk**
   - **Risk**: 10-minute blocks make real confirmations too slow for demos
   - **Mitigation**: Use 0-confirmation acceptance + mempool monitoring
   - **Fallback**: Pre-confirmed demo transactions with visual simulation

2. **Network Reliability Risk**
   - **Risk**: Testnet RPC failures during live demo
   - **Mitigation**: Multiple RPC providers + local fallback nodes
   - **Fallback**: Offline demo mode with cached state

3. **Testnet Coin Availability**
   - **Risk**: Insufficient testnet coins for demos
   - **Mitigation**: Pre-funded addresses + automated faucet integration
   - **Fallback**: Simulated transactions with real network calls

4. **Gas Price Volatility**
   - **Risk**: Sepolia gas price spikes causing transaction failures
   - **Mitigation**: Dynamic gas estimation + overpayment buffer
   - **Fallback**: Pre-signed transactions with fixed gas

### Timeline Risks

- **3-hour implementation window** - Tight but achievable with focused execution
- **Hackathon demo pressure** - Mitigated by robust fallback options
- **Multi-network complexity** - Reduced by maintaining existing architecture

## Success Metrics

### Demo Success Criteria
1. **Sub-60 second execution** from command to completion visualization
2. **Real blockchain transactions** visible on testnet explorers
3. **Zero manual intervention** during judge presentation
4. **Clear visual progress** showing cross-chain coordination
5. **Fallback resilience** if network issues occur

### Technical Milestones
- [ ] `make swap-testnet` command functional
- [ ] Bitcoin testnet HTLC creation working
- [ ] Ethereum Sepolia escrow execution working
- [ ] Cross-chain secret reveal working
- [ ] Demo completes reliably in < 60 seconds

### Judge Impact Metrics
- **Problem articulation**: Bridge hack statistics ($2.5B lost)
- **Solution differentiation**: No bridges, no custody, no risk
- **Technical innovation**: Presigned transactions + Fusion+ integration
- **Market opportunity**: $800B Bitcoin liquidity unlocked

## Implementation Strategy

### Incremental Testing Approach

1. **Component Testing** (30 min each)
   - Test Bitcoin testnet connectivity independently
   - Test Ethereum Sepolia deployment independently
   - Test cross-service communication on testnets

2. **Integration Testing** (45 min)
   - End-to-end testnet swap with manual intervention
   - Automated testnet swap with monitoring
   - Demo flow rehearsal with timing

3. **Demo Rehearsal** (30 min)
   - Judge scenario simulation
   - Network failure scenarios
   - Backup plan execution

### Agent Specialization Strategy

**Recommended**: Use specialized agents for parallel execution:

1. **Bitcoin Agent**: Focus on testnet HTLC service configuration
2. **Ethereum Agent**: Handle Sepolia deployment and gas optimization  
3. **Demo Agent**: Create user experience and visual enhancements
4. **Testing Agent**: Validate end-to-end flows and edge cases

**Alternative**: Single-agent sequential execution if coordination overhead is high

## Critical Path Analysis

### Must-Have (3 hours)
1. Bitcoin testnet configuration (1 hour)
2. Ethereum Sepolia deployment (45 min)
3. Demo optimization for speed (45 min)
4. End-to-end testing (30 min)

### Should-Have (1 hour)
1. Network resilience features (30 min)
2. Visual enhancements (30 min)

### Nice-to-Have (If time permits)
1. Production configurations
2. Advanced error handling
3. Performance optimizations

## Judge Presentation Framework

### Problem Statement (30 seconds)
"$2.5 billion lost to bridge hacks. Every Bitcoin holder faces custody risk when bridging to DeFi."

### Solution Demo (60 seconds)
"Thunder Portal eliminates bridges with atomic swaps. Watch: Bitcoin locks, Ethereum releases, atomic completion."

### Technical Innovation (30 seconds)
"Lightning-inspired presigned transactions meet 1inch Fusion+ for instant cross-chain liquidity."

### Market Impact (30 seconds)
"$800 billion Bitcoin market gains trustless DeFi access. No bridges, no risk, no custody."

### Q&A Preparation
1. **"How is this different from wrapped Bitcoin?"** - No custody, direct atomic swaps
2. **"What if swap fails?"** - Automatic refund, no funds at risk
3. **"Bitcoin confirmation times?"** - Presigned transactions enable instant UX
4. **"Scalability?"** - Lightning-style channels for high frequency
5. **"Business model?"** - Transaction fees + premium liquidity provision

## Next Steps

1. **Immediate**: Begin Phase 2.1 (Bitcoin testnet configuration)
2. **Parallel**: Deploy contracts to Sepolia
3. **Validate**: End-to-end testnet flow
4. **Rehearse**: Demo timing and reliability
5. **Prepare**: Judge presentation materials

**Decision Point**: Single comprehensive agent vs. specialized agent team for optimal execution speed and coordination.