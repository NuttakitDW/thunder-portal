# Thunder Portal - Bitcoin HTLC Demo

## What is Thunder Portal?
A non-custodial API service for Bitcoin ↔ Ethereum atomic swaps using HTLCs (Hash Time-Locked Contracts).

## Live Demo in 3 Steps

### 1️⃣ Create HTLC Contract
```bash
curl -X POST http://localhost:3000/v1/htlc/create \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{"preimage_hash":"66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925","user_public_key":"0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798","timeout_blocks":144}'
```
**Result**: Bitcoin P2SH address for atomic swap

### 2️⃣ Fund with Bitcoin
- Send 0.001 BTC to the generated address
- Use testnet wallet (Electrum --testnet)
- Get free testnet BTC: https://bitcoinfaucet.uo1.net/

### 3️⃣ Verify On-Chain
```bash
curl -X POST http://localhost:3000/v1/htlc/verify \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"YOUR_ORDER_ID","htlcAddress":"YOUR_HTLC_ADDRESS","redeemScript":"YOUR_SCRIPT","fundingTxId":"YOUR_TX_ID"}'
```
**Result**: Verified HTLC ready for atomic swap

## See It Live
- **Interactive Demo**: `./demo/interactive_demo.sh`
- **API Docs**: http://localhost:3000/swagger-ui
- **Block Explorer**: https://blockstream.info/testnet/

## Why Thunder Portal?
✅ **Non-Custodial** - Users control their funds  
✅ **Atomic** - All-or-nothing execution  
✅ **API-First** - Easy integration  
✅ **Production Ready** - Real Bitcoin transactions

## Get Started
```bash
git clone <repo>
cd bitcoin-htlc
cp .env.testnet .env
cargo run
./demo/interactive_demo.sh
```

**Questions?** Check TESTNET_TUTORIAL.md or visit http://localhost:3000/swagger-ui