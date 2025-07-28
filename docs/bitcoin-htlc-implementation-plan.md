# Bitcoin HTLC Implementation Plan for Thunder Portal

## Overview

Since Boltz doesn't support BTC mainchain → BTC mainchain swaps directly, we'll implement our own Bitcoin HTLC based on studying Boltz's open-source code.

## HTLC Script Structure

Based on Boltz's implementation, our Bitcoin HTLC script will be:

```
HASH160 <payment_hash> EQUAL
IF
    <user_pubkey>
ELSE
    <timeout_blocks> CHECKLOCKTIMEVERIFY DROP
    <resolver_pubkey>
ENDIF
CHECKSIG
```

## Implementation Steps

### 1. Study Boltz Code (Priority: High)
- [ ] Clone [boltz-backend](https://github.com/BoltzExchange/boltz-backend)
- [ ] Study `/lib/swap/SwapManager.ts`
- [ ] Examine `/lib/wallet/WalletManager.ts`
- [ ] Review Bitcoin script templates in `/lib/consts/Scripts.ts`

### 2. Core Components

#### A. Preimage Management
```javascript
// Generate secure preimage
const preimage = crypto.randomBytes(32);
const paymentHash = crypto.createHash('sha256').update(preimage).digest();
const paymentHashRipemd = crypto.createHash('ripemd160').update(paymentHash).digest();
```

#### B. HTLC Script Creation
```javascript
const script = bitcoin.script.compile([
  bitcoin.opcodes.OP_HASH160,
  paymentHashRipemd,
  bitcoin.opcodes.OP_EQUAL,
  bitcoin.opcodes.OP_IF,
    Buffer.from(userPubkey, 'hex'),
  bitcoin.opcodes.OP_ELSE,
    bitcoin.script.number.encode(timeoutBlockHeight),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.opcodes.OP_DROP,
    Buffer.from(resolverPubkey, 'hex'),
  bitcoin.opcodes.OP_ENDIF,
  bitcoin.opcodes.OP_CHECKSIG
]);
```

#### C. P2SH Address Generation
```javascript
const p2sh = bitcoin.payments.p2sh({
  redeem: { output: script },
  network: bitcoin.networks.bitcoin
});
// p2sh.address is where resolver sends BTC
```

### 3. Transaction Flow

#### Phase 1: Setup
1. Generate preimage and hash
2. Create HTLC script
3. Generate P2SH address
4. Share payment hash with Fusion+ side

#### Phase 2: Funding
1. Resolver sends BTC to P2SH address
2. Wait for confirmation
3. Signal Fusion+ side to proceed

#### Phase 3: Claiming
1. User reveals preimage on Fusion+
2. Resolver detects preimage
3. User claims BTC with preimage + signature

#### Phase 4: Refund (if needed)
1. Wait for timeout block height
2. Resolver reclaims with signature

## Key Differences from Boltz

| Aspect | Boltz | Thunder Portal |
|--------|-------|----------------|
| Swap Type | Cross-chain (BTC↔Lightning/Liquid) | Same-chain (BTC↔BTC) |
| Complexity | Multiple protocols | Single protocol |
| Infrastructure | Full node support | Simpler requirements |

## Security Considerations

1. **Timeout Coordination**
   - Bitcoin timeout > Ethereum timeout
   - Account for block time variance
   - Minimum 6 hours difference recommended

2. **Fee Management**
   - Pre-calculate claim transaction fees
   - Reserve extra for fee spikes
   - Monitor mempool conditions

3. **Reorg Protection**
   - Wait for sufficient confirmations
   - Monitor chain tips
   - Have contingency plans

## Testing Strategy

1. **Regtest First**
   - Local Bitcoin regtest network
   - Controlled block generation
   - Test all paths (claim/refund)

2. **Testnet Integration**
   - Bitcoin testnet3
   - Ethereum Sepolia
   - Full end-to-end flow

3. **Edge Cases**
   - Network delays
   - Fee spikes
   - Reorgs
   - Timeout races

## Resources

- [Boltz Backend Source](https://github.com/BoltzExchange/boltz-backend)
- [Bitcoin Script Reference](https://en.bitcoin.it/wiki/Script)
- [BIP 65 (CHECKLOCKTIMEVERIFY)](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)

## Next Steps

1. Set up development environment
2. Clone and study Boltz repositories
3. Create proof-of-concept HTLC script
4. Test on regtest
5. Integrate with Fusion+ coordination logic