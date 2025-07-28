# 1inch Unite Hackathon - Bitcoin Prize Track Detailed Requirements

## Prize: Extend Fusion+ to Bitcoin (Doge/LTC/etc.) - $32,000

### Prize Distribution
- 🥇 1st place: $12,000
- 🥈 2nd place: $7,500
- 🥉 3rd place: $5,000
- 🏅 4th place: $4,000
- 🏅 5th place: $3,500

## Core Challenge

Build a novel extension for 1inch Cross-chain Swap (Fusion+) that enables swaps between Ethereum and one of the following chains:
- Bitcoin
- Dogecoin
- Litecoin
- Bitcoin Cash

## Mandatory Requirements (Must Have)

### 1. ✅ Preserve hashlock and timelock functionality for the non-EVM implementation
- **What this means**: Your solution must use HTLCs (Hash Time-Locked Contracts) or similar mechanisms
- **Important**: You can use existing tools like Boltz API that already implement HTLCs
- **Not required**: Building HTLCs from scratch (using existing infrastructure is fine)

### 2. ✅ Swap functionality should be bidirectional
- **ETH → BTC**: Users can swap ETH/ERC20 tokens for Bitcoin
- **BTC → ETH**: Users can swap Bitcoin for ETH/ERC20 tokens
- **Both directions must work** for a complete solution

### 3. ✅ Onchain (mainnet or testnet) execution of token transfers should be presented during the final demo
- **Live demo required**: Show actual transactions on-chain
- **Testnet is acceptable**: Don't need to use real mainnet funds
- **Must show both sides**: ETH transaction AND Bitcoin transaction

## Stretch Goals (Nice to Have - Not Required)

### 1. 🎨 UI
- User interface for initiating swaps
- Transaction status tracking
- Swap history

### 2. 🔄 Enable partial fills
- Allow orders to be partially filled
- Multiple resolvers can fill portions of a single order

### 3. 🌐 Relayer and resolver
- Implement resolver infrastructure
- Support for multiple resolvers competing
- Relayer for order broadcasting

## What You Need to Build

### Minimum Viable Solution
1. **Resolver Implementation**
   - Monitors 1inch Fusion+ orders
   - Executes atomic swaps between ETH and BTC
   - Handles the coordination logic

2. **Integration Points**
   - Connect to 1inch Fusion+ on Ethereum side
   - Connect to Bitcoin (using Boltz API or custom implementation)
   - Ensure atomic execution with shared hash

3. **Demo Requirements**
   - Show ETH → BTC swap working
   - Show BTC → ETH swap working
   - Display on-chain transactions for verification

## Technical Clarifications

### Using Third-Party APIs
- ✅ **Allowed**: Using Boltz API or similar services
- ✅ **Allowed**: Using existing Bitcoin libraries
- ✅ **Allowed**: Using existing HTLC implementations
- ❌ **Not allowed**: Centralized custodial solutions

### What "Preserve hashlock and timelock" means
- Your solution must maintain atomic swap guarantees
- Both sides locked with same hash
- Timeouts protect funds if swap fails
- Can be achieved via Boltz API or custom implementation

### Chains You Can Choose
- **Bitcoin** - The main prize focus
- **Dogecoin** - Similar to Bitcoin, UTXO-based
- **Litecoin** - Bitcoin fork, similar implementation
- **Bitcoin Cash** - Another Bitcoin fork

## Judging Criteria (Inferred)

1. **Technical Implementation**
   - Correct atomic swap implementation
   - Security considerations
   - Code quality

2. **Functionality**
   - Both swap directions work
   - Reliable execution
   - Proper error handling

3. **Innovation**
   - Novel approach to the problem
   - Efficient resolver design
   - Good user experience

4. **Demo Quality**
   - Clear demonstration of working swaps
   - On-chain verification
   - Professional presentation

## Common Misconceptions to Avoid

1. **"Must implement Bitcoin Script from scratch"** - FALSE
   - Using Boltz API or similar is perfectly acceptable
   - Focus on the integration, not low-level implementation

2. **"Must use Lightning Network"** - FALSE
   - Direct Bitcoin mainchain swaps are the focus
   - Lightning is not mentioned in requirements

3. **"Must build everything custom"** - FALSE
   - Leverage existing infrastructure
   - Focus on novel integration approach

4. **"UI is required"** - FALSE
   - UI is a stretch goal, not mandatory
   - CLI or API demonstration is sufficient

## Recommended Approach

1. **Use Boltz API** for Bitcoin-side HTLC handling
2. **Integrate with Fusion+** for Ethereum-side logic
3. **Build resolver** to coordinate between both sides
4. **Focus on reliability** over complex features
5. **Prepare clear demo** showing both swap directions

## Success Tips

- Start with testnet implementation
- Test edge cases (timeouts, failures)
- Document your architecture clearly
- Prepare backup demo videos in case of live demo issues
- Focus on core requirements before stretch goals

Remember: The judges want to see a working cross-chain swap between Ethereum and Bitcoin that maintains the security guarantees of atomic swaps. How you achieve this (custom or using tools like Boltz) is up to you!