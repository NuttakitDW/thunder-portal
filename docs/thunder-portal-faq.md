# Thunder Portal FAQ - Frequently Asked Questions

## General Questions

### Q: What is Thunder Portal?
**A:** Thunder Portal is a non-custodial bridge that enables atomic swaps between 1inch Fusion+ (Ethereum) and Bitcoin. It allows users to swap ETH/ERC20 tokens for BTC and vice versa without trusting intermediaries.

### Q: What makes Thunder Portal different from other bridges?
**A:** Unlike wrapped token bridges or centralized exchanges, Thunder Portal uses atomic swaps with HTLCs (Hash Time-Locked Contracts). This means:
- No wrapped tokens (you get real BTC, not WBTC)
- No custodial risk (funds are never held by third parties)
- No bridge hacks possible (no honeypot to attack)
- Guaranteed atomic execution (all-or-nothing swaps)

### Q: Is Thunder Portal decentralized?
**A:** Yes, Thunder Portal is non-custodial and trustless. While resolvers facilitate swaps, they cannot steal funds due to the cryptographic guarantees of HTLCs. Anyone can run a resolver.

## Technical Questions

### Q: What does "atomic" mean in atomic swaps?
**A:** "Atomic" means the swap is indivisible - it either completes fully on both chains or fails completely. There's no possibility of partial execution where one party loses funds. This is guaranteed by cryptography, not trust.

### Q: Can the user claim both BTC and ETH using their preimage?
**A:** No. This is a common misconception. Here's why:
- User locks THEIR OWN ETH → Only resolver can claim it
- Resolver locks THEIR OWN BTC → Only user can claim it
- The preimage allows claiming the OTHER party's funds, not your own
- Each HTLC specifies who can claim (cross-claim only)

### Q: How do HTLCs work?
**A:** HTLCs are smart contracts that lock funds with two conditions:
1. **Hash Lock**: Funds can be claimed by revealing a secret (preimage)
2. **Time Lock**: Funds can be refunded after a timeout period

Both chains use the same hash, ensuring that revealing the preimage on one chain allows claiming on the other.

### Q: What happens if something goes wrong during a swap?
**A:** The time-lock mechanism ensures funds are never lost:
- If user doesn't reveal preimage → Both parties get refunded after timeout
- If resolver doesn't claim ETH → User still gets BTC, resolver can claim later
- If network issues occur → Timeout refunds protect both parties

### Q: Why are there different timeout periods?
**A:** Timeout periods are carefully ordered to prevent attacks:
```
Ethereum timeout: 24 hours
Bitcoin timeout: 48 hours
```
This gives the resolver time to claim on Ethereum after the user claims on Bitcoin, preventing race conditions.

## Security Questions

### Q: Can a resolver steal my funds?
**A:** No. Resolvers cannot access funds without the preimage, which only the user knows initially. The HTLC smart contracts enforce this cryptographically.

### Q: What if the resolver disappears after I lock my ETH?
**A:** If the resolver doesn't lock BTC, you simply wait for the timeout and reclaim your ETH. No funds are lost.

### Q: Can someone front-run my swap?
**A:** No. Each swap uses a unique hash derived from a secret preimage only you know. No one else can claim your specific swap.

### Q: Is it safe to reveal the preimage?
**A:** Yes, but timing matters:
1. Only reveal the preimage AFTER verifying the resolver has locked BTC
2. Once revealed, both swaps will execute atomically
3. Never share your preimage before the swap is properly set up

### Q: What about blockchain reorganizations?
**A:** Thunder Portal waits for sufficient confirmations:
- Bitcoin: 3-6 confirmations (30-60 minutes)
- Ethereum: 12-30 confirmations (3-7 minutes)
This protects against reorg attacks.

## User Experience Questions

### Q: How long does a swap take?
**A:** Typical swap times:
- Setup: 1-2 minutes
- Bitcoin confirmation: 10-30 minutes
- Ethereum confirmation: 1-5 minutes
- Total: ~15-40 minutes

### Q: What are the fees?
**A:** Fees include:
- Bitcoin network fee (varies with congestion)
- Ethereum gas fee (varies with network usage)
- Resolver service fee (typically 0.1-0.3%)
- No Thunder Portal protocol fee

### Q: What's the minimum/maximum swap amount?
**A:** Limits depend on:
- Minimum: Must cover network fees (typically $50-100)
- Maximum: Based on resolver liquidity (can be $100k+)
- Check current limits in the UI

### Q: Can I cancel a swap?
**A:** 
- Before locking funds: Yes, simply don't proceed
- After locking funds: No, but timeout refunds protect you
- After revealing preimage: No, swap will complete atomically

## Integration Questions

### Q: How does Thunder Portal integrate with 1inch Fusion+?
**A:** Thunder Portal implements a custom resolver that:
1. Monitors Fusion+ orders for Bitcoin destinations
2. Creates matching Bitcoin HTLCs
3. Coordinates atomic execution between chains
4. Reports status back to Fusion+ protocol

### Q: Can I use Thunder Portal directly without 1inch?
**A:** Currently, Thunder Portal is designed as a 1inch Fusion+ extension. Direct API access may be available for developers in the future.

### Q: Does Thunder Portal support other Bitcoin-like chains?
**A:** Future support planned for:
- Litecoin (LTC)
- Dogecoin (DOGE)
- Bitcoin Cash (BCH)
Any chain with HTLC script support can be added.

## Troubleshooting

### Q: My swap seems stuck. What should I do?
**A:** Check the swap status:
1. **Waiting for confirmations**: Be patient, check block explorers
2. **Waiting for preimage**: You need to reveal it to proceed
3. **Timeout approaching**: Decide whether to complete or let it refund
4. **Failed**: Wait for automatic refund after timeout

### Q: The resolver isn't responding. What now?
**A:** 
- HTLCs protect your funds regardless of resolver availability
- If resolver doesn't lock BTC: Your ETH refunds after timeout
- If resolver locked BTC: Claim it with your preimage
- Contact support for assistance with specific swap IDs

### Q: I revealed my preimage but didn't get BTC. Why?
**A:** Possible reasons:
1. Bitcoin transaction still confirming (check block explorer)
2. Incorrect Bitcoin address provided
3. Network congestion causing delays
Your funds are safe - either you'll receive BTC or timeout refund.

## Economic Questions

### Q: How do resolvers make money?
**A:** Resolvers earn through:
- Service fees (0.1-0.3% typical)
- Spread between buy/sell rates
- Arbitrage opportunities
- Fusion+ rewards/incentives

### Q: Why would resolvers provide liquidity?
**A:** Resolvers are incentivized by:
- Profitable fee structure
- Low risk due to atomic swaps
- Automated operation possible
- Growing cross-chain volume

### Q: How is the exchange rate determined?
**A:** Rates are based on:
- Current market prices from multiple sources
- Network fee estimates
- Resolver's spread/margin
- Supply and demand for each direction

## Advanced Questions

### Q: Can Thunder Portal be used for privacy?
**A:** While Thunder Portal doesn't add privacy features, swapping to Bitcoin can be a step toward privacy:
- Bitcoin has better privacy tools (CoinJoin, Lightning)
- No on-chain link between your ETH and BTC addresses
- Consider additional privacy measures after swapping

### Q: Is Thunder Portal quantum-resistant?
**A:** Current implementation uses:
- SHA256 hashes (quantum-resistant)
- ECDSA signatures (not quantum-resistant)
Future upgrades may include quantum-resistant signatures when available.

### Q: Can I run my own resolver?
**A:** Yes! Resolvers are permissionless:
1. Deploy the resolver software
2. Provide BTC and ETH liquidity
3. Configure your fee structure
4. Register with the Fusion+ protocol
See our resolver documentation for details.

### Q: What about MEV (Maximum Extractable Value)?
**A:** Thunder Portal is MEV-resistant because:
- Unique hashes prevent swap hijacking
- Timeout ordering prevents griefing
- Atomic execution leaves no arbitrage
- Resolvers compete on service, not extraction

## Getting Help

### Q: Where can I get support?
**A:** 
- Documentation: https://docs.thunderportal.io
- Discord: https://discord.gg/thunderportal
- Email: support@thunderportal.io
- GitHub: https://github.com/thunderportal

### Q: How do I report bugs or security issues?
**A:** 
- Bugs: GitHub issues
- Security: security@thunderportal.io (PGP available)
- Urgent: Discord emergency channel
- Always include swap IDs and transaction hashes

### Q: Is there a bug bounty program?
**A:** Yes! We offer rewards for finding:
- Critical vulnerabilities: Up to $50,000
- High severity: Up to $10,000
- Medium severity: Up to $2,500
See our security policy for details.

---

*Last updated: January 2025*