# 1inch Unite Hackathon - Bitcoin Prize Track Official Requirements

**Event Dates**: July 25 – August 6, 2025  
**Submission Deadline**: August 3, 2025 at 4:00 PM  

## Prize: Extend Fusion+ to Bitcoin (Doge/LTC/etc.) — $32,000

### Prize Distribution
- 🥇 1st place: $12,000
- 🥈 2nd place: $7,500
- 🥉 3rd place: $5,000
- 🏅 4th place: $4,000
- 🏅 5th place: $3,500

## Official Challenge Description

Build a novel extension for 1inch Cross-chain Swap (Fusion+) that enables swaps between Ethereum and one of the following chains:
- Bitcoin
- Dogecoin
- Litecoin
- Bitcoin Cash

## Qualification Requirements

### Requirements:
1. **Preserve hashlock and timelock functionality for the non-EVM implementation**
2. **Swap functionality should be bidirectional (swaps should be possible to and from Ethereum)**
3. **Onchain (mainnet or testnet) execution of token transfers should be presented during the final demo**

### Stretch goals (not hard requirements):
- UI
- Enable partial fills
- Relayer and resolver

## What This REALLY Means

### 1. Preserve hashlock and timelock functionality
**What judges want to see:**
- Atomic swap implementation using HTLCs
- Same hash locks both chains
- Timeout protection if swap fails
- No custody risk - trustless execution

**Implementation approach:**
- Bitcoin P2SH scripts with HTLC logic
- Ethereum smart contract with matching hash
- Proper timeout hierarchy (Bitcoin > Ethereum)

### 2. Bidirectional swaps
**What judges want to see:**
- ETH/ERC20 → BTC working flow
- BTC → ETH/ERC20 working flow
- Both directions fully functional
- Clear demonstration of both

**Implementation approach:**
- Order system supporting both directions
- Status tracking for each flow
- Proper state management

### 3. Onchain execution demo
**What judges want to see:**
- Live transactions on testnet/mainnet
- Bitcoin transaction visible on explorer
- Ethereum transaction visible on explorer
- Real atomic swap execution

**Demo requirements:**
- Transaction IDs/links ready
- Block explorers open
- Clear flow explanation
- Handle potential delays gracefully

## Focus Areas for Winning

### Technical Excellence
1. **Correct atomic swap implementation**
   - No trust assumptions
   - Mathematically guaranteed atomicity
   - Proper timeout handling

2. **1inch Fusion+ Integration**
   - Native integration with Fusion+ protocol
   - Resolver acts as cross-chain bridge
   - Maintains Fusion+ order semantics

3. **Security First**
   - No custody of user funds
   - Clear failure recovery paths
   - Timeout hierarchy prevents griefing

### What NOT to Focus On

1. **UI is NOT required** - It's a stretch goal
2. **Partial fills are NOT required** - Nice to have
3. **Complex relayer infrastructure** - Keep it simple

## Winning Strategy

### Core Implementation (100% Focus)
1. **Bidirectional atomic swaps that work**
2. **Clean integration with Fusion+**
3. **Reliable demo execution**
4. **Clear technical documentation**

### If Time Permits (Stretch Goals)
1. Basic UI for easier demo
2. Multiple resolver support
3. Partial fill capability

## Demo Script Essentials

### Part 1: ETH → BTC
1. Show Fusion+ order creation
2. Show Bitcoin HTLC creation
3. Execute swap
4. Show both transactions complete

### Part 2: BTC → ETH
1. Show Bitcoin HTLC creation
2. Show Fusion+ order filling
3. Execute swap
4. Show both transactions complete

### Part 3: Technical Deep Dive
1. Explain hashlock/timelock preservation
2. Show atomic guarantee
3. Demonstrate failure case handling

## Judge Evaluation Criteria (Inferred)

1. **Does it work?** - Both directions must function
2. **Is it secure?** - Atomic swaps properly implemented
3. **Is it integrated?** - Native Fusion+ extension
4. **Is it novel?** - Unique approach to the problem
5. **Demo quality** - Clear, professional presentation

## Common Pitfalls to Avoid

1. **Over-engineering** - Focus on core requirements
2. **UI before functionality** - It's not required
3. **Ignoring demo prep** - Practice the demo flow
4. **Missing bidirectional** - Both directions must work
5. **Centralized shortcuts** - Must be trustless

## Remember

The judges want to see:
- **Working atomic swaps** between Ethereum and Bitcoin
- **Both directions** functioning properly
- **Live demo** with real transactions
- **Fusion+ integration** that makes sense

Everything else is secondary. Focus on these four points for success.