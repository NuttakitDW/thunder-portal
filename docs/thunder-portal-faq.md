# Thunder Portal FAQ

## General Questions

### Q: What is Thunder Portal?
**A:** Thunder Portal is a non-custodial bridge that enables atomic swaps between 1inch Fusion+ (Ethereum) and Bitcoin. It consists of two main components:
1. Bitcoin HTLC API Service - Handles Bitcoin atomic swap operations
2. Custom Fusion+ Resolver - Bridges between Fusion+ and Bitcoin

### Q: How does Thunder Portal work with 1inch Fusion+?
**A:** Thunder Portal extends Fusion+ to support Bitcoin by:
1. Monitoring Fusion+ orders that specify Bitcoin as destination
2. Creating matching Bitcoin HTLCs using our API
3. Coordinating atomic execution between both chains
4. Using the same hash on both sides to ensure atomicity

## Core Concepts

### Q: What does "atomic" mean in atomic swaps?
**A:** "Atomic" means the swap is all-or-nothing - it either completes fully on both chains or fails completely with funds returned. This is guaranteed by cryptography, not trust. There's no possibility of one party receiving funds while the other loses theirs.

### Q: Can the user claim both BTC and ETH using their preimage?
**A:** No. This is a key security feature:
- User locks THEIR OWN ETH → Only resolver can claim it with preimage
- Resolver locks THEIR OWN BTC → Only user can claim it with preimage
- The preimage allows claiming the OTHER party's funds, not your own
- Each HTLC specifies who can claim (cross-claim only)

### Q: How do HTLCs work?
**A:** HTLCs (Hash Time-Locked Contracts) lock funds with two conditions:
1. **Hash Lock**: Funds can be claimed by revealing a secret (preimage) where SHA256(preimage) = hash
2. **Time Lock**: Funds can be refunded to original owner after a timeout period

### Q: What's the difference between submarine, reverse, and chain swaps?
**A:** Based on our API design:
- **Submarine swap**: ETH/ERC20 → BTC (user sends on Ethereum, receives Bitcoin)
- **Reverse swap**: BTC → ETH/ERC20 (user sends Bitcoin, receives on Ethereum)
- **Chain swap**: BTC → BTC (atomic swap between different Bitcoin addresses)

## Architecture Questions

### Q: Why separate Bitcoin API from the resolver?
**A:** This separation provides:
- Clean architecture with focused responsibilities
- Bitcoin API can be reused by multiple resolvers
- Easier testing and development
- Clear interface between Fusion+ and Bitcoin operations

### Q: Is the resolver a smart contract?
**A:** No, the resolver is an off-chain service that:
- Monitors Fusion+ orders
- Manages liquidity on both chains
- Calls our Bitcoin API to create/manage HTLCs
- Executes swaps when conditions are met

### Q: Do we need to modify the existing 1inch resolver?
**A:** Yes, we need to create a custom resolver that:
- Understands Bitcoin destinations in Fusion+ orders
- Integrates with our Bitcoin HTLC API
- Manages the atomic swap lifecycle
- Handles Bitcoin-specific requirements (confirmations, UTXOs, etc.)

## Technical Questions

### Q: What happens if something goes wrong during a swap?
**A:** The timeout mechanism protects both parties:
- If user doesn't reveal preimage → Both get refunded after timeout
- If resolver disappears → User waits for timeout and gets ETH back
- If Bitcoin network is slow → Extended timeouts provide buffer

### Q: How are timeouts coordinated?
**A:** Timeouts must be ordered to prevent race conditions:
```
Bitcoin timeout: 48 hours (longer)
Ethereum timeout: 24 hours (shorter)
```
This ensures the resolver has time to claim on Ethereum after the user claims on Bitcoin.

### Q: What endpoints does the Bitcoin API provide?
**A:** The Thunder Portal API provides:
- Swap creation and management
- Status monitoring
- Claim and refund operations
- Webhook notifications for real-time updates
- Fee estimation and health checks

---

*This FAQ focuses on the actual questions and concepts we've discussed during development of Thunder Portal.*