# 1inch Fusion+ Q&A Index

This index contains comprehensive answers to common questions about implementing 1inch Fusion+ cross-chain swaps.

## Available Q&A Documents

### 1. [HTLC Implementation with Fusion+ on Ethereum](./htlc-fusion-plus-ethereum.md)
**Date**: 2025-01-29  
**Topics Covered**:
- Built-in HTLC functionality in Fusion+
- Whether custom HTLC contracts are needed
- How settlement contracts handle hash-locked conditions
- Standard approach for cross-chain atomic swaps
- Implementation examples and code snippets

## Quick Reference

### Core Concepts
- **Fusion+**: Cross-chain swap protocol using atomic swaps and HTLC technology
- **Escrow Contracts**: EscrowSrc (source chain) and EscrowDst (destination chain)
- **Resolvers**: Professional traders who execute swaps and manage escrows
- **Atomic Swaps**: All-or-nothing transactions secured by hash and time locks

### Key Takeaways
1. Fusion+ has complete built-in HTLC infrastructure
2. No need to create custom HTLC contracts
3. Focus on implementing resolver logic
4. Use existing escrow factory contracts
5. Follow the standard atomic swap flow

## Additional Resources
- [Official Fusion+ Documentation](https://1inch.io/fusion/)
- [GitHub Repositories](https://github.com/1inch)
- [Technical Blog Posts](https://blog.1inch.io)

---
*This index is continuously updated as new Q&A documents are added.*