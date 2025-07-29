# HTLC Implementation with 1inch Fusion+ on Ethereum

## Overview

1inch Fusion+ uses Hash Time-Locked Contracts (HTLCs) as the core mechanism for cross-chain atomic swaps. This document answers key questions about implementing HTLCs with Fusion+ on Ethereum.

## Key Questions and Answers

### 1. Does Fusion+ already have built-in HTLC functionality that we can use?

**Yes**, Fusion+ has comprehensive built-in HTLC functionality through its escrow contract system:

- **EscrowSrc**: Holds user's tokens on the source chain
- **EscrowDst**: Holds resolver's tokens on the destination chain
- **EscrowFactory**: Deploys escrow clones for each swap

The HTLC mechanism is implemented using:
- Hash locks with Merkle tree of secrets (`keccak256(index, hashedSecret)`)
- Time locks with defined periods for withdrawal and cancellation
- Atomic execution ensuring all-or-nothing swaps

### 2. Do we need to create our own HTLC smart contract on Ethereum?

**No**, you don't need to create your own HTLC contracts. Fusion+ provides:

- Pre-deployed `EscrowSrc`, `EscrowDst`, and `EscrowFactory` contracts on each chain
- Proxy pattern using EIP-1167 for gas-efficient escrow deployment
- Complete HTLC implementation with hash and time lock mechanisms

However, you **do need to**:
- Implement a resolver contract that interacts with these escrow contracts
- Deploy escrow clones for each specific swap
- Handle secret management and withdrawal logic

### 3. How does the Fusion+ settlement contract handle hash-locked conditions?

The settlement process works as follows:

1. **Secret Generation**: 
   - For N parts, N + 1 secrets are generated
   - Secrets are indexed and prorated to cumulative fill values
   - A Merkle tree is built from all secrets

2. **Hash Lock Validation**:
   - The relayer service checks hashlock validity on both chains
   - Guarantees the secret will be revealed at the appropriate time
   - Uses `onlyValidImmutables()` checks with CREATE2 addresses

3. **Conditional Execution**:
   ```solidity
   // Example from resolver implementation
   function withdraw(
       bytes32 secret,
       IEscrowSrc.Immutables calldata immutables
   ) external {
       IEscrowSrc escrow = IEscrowFactory(escrowFactory).addressOfEscrowSrc(immutables);
       escrow.withdraw(secret, immutables);
   }
   ```

4. **Security Features**:
   - Hashlocks cannot be reused
   - Timelock protection ensures funds return if swap fails
   - All conditions verified by smart contracts

### 4. What's the standard approach for cross-chain atomic swaps with Fusion+?

The standard approach follows these steps:

1. **Order Creation**:
   - User creates and signs a Fusion limit order with `hash(secret)`
   - Order includes source tokens, destination requirements, and timelock parameters

2. **Resolver Actions**:
   ```solidity
   // Deploy source escrow
   function deploySrc(
       IEscrowFactory factory,
       uint256 srcSafetyDeposit,
       IEscrowSrc.Immutables calldata immutables,
       bytes calldata takerInteraction
   ) external payable {
       address computedEscrow = factory.addressOfEscrowSrc(immutables);
       // ... deployment logic
   }
   ```

3. **Escrow Deployment**:
   - Resolver deploys escrow contracts on both chains
   - Deposits safety tokens as collateral
   - Uses same secret hash on both sides

4. **Swap Execution**:
   - Once both escrows are active, secret is revealed
   - Resolver withdraws destination tokens using secret
   - User claims source tokens with same secret

5. **Failure Handling**:
   - If timelock expires, funds return to original owners
   - Resolver can cancel escrows if swap fails
   - Public cancellation available after timeout

## Implementation Example

Here's a simplified resolver implementation pattern:

```solidity
contract Resolver is Ownable {
    // Deploy escrow on source chain
    function deploySrc(
        IEscrowFactory factory,
        uint256 srcSafetyDeposit,
        IEscrowSrc.Immutables calldata immutables,
        bytes calldata takerInteraction
    ) external payable onlyOwner {
        // Compute escrow address
        address escrow = factory.addressOfEscrowSrc(immutables);
        
        // Set deployment timestamp
        immutables.timelocks.deployedAt = uint32(block.timestamp);
        
        // Send safety deposit
        Address.sendValue(payable(escrow), srcSafetyDeposit);
        
        // Fill order with escrow address
        // ... order filling logic
    }
    
    // Withdraw using secret
    function withdraw(
        bytes32 secret,
        IEscrowSrc.Immutables calldata immutables
    ) external onlyOwner {
        IEscrowSrc escrow = IEscrowFactory(escrowFactory).addressOfEscrowSrc(immutables);
        escrow.withdraw(secret, immutables);
    }
}
```

## Key Considerations

1. **Gas Optimization**: Uses clone pattern to minimize deployment costs
2. **Security**: Never reuse secrets or hashlocks
3. **Monitoring**: Watch for `publicWithdraw` events to retrieve secrets
4. **Testing**: Thoroughly test on testnets before mainnet deployment

## Resources

- [1inch Cross-Chain Swap Repository](https://github.com/1inch/cross-chain-swap)
- [Cross-Chain Resolver Example](https://github.com/1inch/cross-chain-resolver-example)
- [Fusion SDK](https://github.com/1inch/fusion-sdk)

## Summary

Fusion+ provides complete HTLC infrastructure - you don't need custom HTLC contracts. Focus on implementing a resolver that:
1. Deploys escrow clones via the factory
2. Manages secrets and withdrawals
3. Handles timeouts and cancellations
4. Integrates with Fusion+ order system

The protocol handles all hash-lock validation, atomic execution, and cross-chain coordination through its built-in escrow system.