const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Import services
const merkleDemo = require('./merkle-demo');
const BitcoinService = require('./bitcoin-service');

// Configuration
const BITCOIN_API = 'http://localhost:3000/v1';
const RELAYER_API = 'http://localhost:3001';
const ETHEREUM_RPC = 'http://localhost:8545';
const PORT = 3002;

// Services
const bitcoinService = new BitcoinService();

// Ethereum setup
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
const resolver = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);

// Escrow ABI
const ESCROW_ABI = [
  "function createHTLC() external payable",
  "function claimHTLC(bytes32 preimage) external",
  "function refundHTLC() external",
  "function getStatus() external view returns (bool active, uint256 amount, uint256 timeout, bool claimed)"
];

// Factory ABI
const FACTORY_ABI = [
  "function createEscrow(bytes32 orderHash, address maker, address receiver, bytes32 htlcHashlock, uint256 htlcTimeout) external returns (address escrow)",
  "function escrows(bytes32) external view returns (address)"
];

// Factory address (from deployment)
const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Express app
const app = express();
app.use(express.json());

// Active orders being resolved
const activeOrders = new Map();

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'thunder-portal-resolver' });
});

// Execute swap - called when user wants to swap
app.post('/execute-swap', async (req, res) => {
  const { orderId, escrowAddress, amount, preimage } = req.body;
  
  console.log(`[RESOLVER] Executing swap for order ${orderId}`);
  
  try {
    // Connect to escrow contract
    const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
    
    // Fund the HTLC on Ethereum side
    console.log(`[RESOLVER] Funding Ethereum HTLC with ${amount} ETH`);
    const fundTx = await escrow.createHTLC({ value: ethers.parseEther(amount) });
    await fundTx.wait();
    
    // Store order details
    activeOrders.set(orderId, {
      orderId,
      escrowAddress,
      amount,
      preimage,
      ethereumFunded: true,
      status: 'ETHEREUM_FUNDED'
    });
    
    res.json({
      message: 'Ethereum HTLC funded',
      orderId,
      escrowAddress,
      txHash: fundTx.hash
    });
    
  } catch (error) {
    console.error('[RESOLVER] Error executing swap:', error);
    res.status(500).json({ error: 'Failed to execute swap' });
  }
});

// Claim HTLC with preimage
app.post('/claim-htlc', async (req, res) => {
  const { orderId, escrowAddress, preimage } = req.body;
  
  console.log(`[RESOLVER] Claiming HTLC for order ${orderId}`);
  
  try {
    // Connect to escrow contract
    const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
    
    // Convert preimage to bytes32
    const preimageBytes32 = ethers.hexlify(ethers.toUtf8Bytes(preimage)).padEnd(66, '0');
    
    // Claim the HTLC
    const claimTx = await escrow.claimHTLC(preimageBytes32);
    await claimTx.wait();
    
    console.log(`[RESOLVER] HTLC claimed successfully for order ${orderId}`);
    
    // Update order status
    const order = activeOrders.get(orderId);
    if (order) {
      order.status = 'COMPLETED';
      order.claimed = true;
    }
    
    res.json({
      message: 'HTLC claimed successfully',
      orderId,
      txHash: claimTx.hash
    });
    
  } catch (error) {
    console.error('[RESOLVER] Error claiming HTLC:', error);
    res.status(500).json({ error: 'Failed to claim HTLC' });
  }
});

// Get escrow status
app.get('/escrow-status/:escrowAddress', async (req, res) => {
  try {
    const escrow = new ethers.Contract(req.params.escrowAddress, ESCROW_ABI, provider);
    const status = await escrow.getStatus();
    
    res.json({
      escrowAddress: req.params.escrowAddress,
      active: status.active,
      amount: ethers.formatEther(status.amount),
      timeout: status.timeout.toString(),
      claimed: status.claimed
    });
  } catch (error) {
    console.error('[RESOLVER] Error getting escrow status:', error);
    res.status(500).json({ error: 'Failed to get escrow status' });
  }
});

// Execute real atomic swap with actual blockchain transactions
app.post('/execute-real-swap', async (req, res) => {
  const { orderId, bitcoinAmount, ethereumAmount, userAddress } = req.body;
  
  console.log(`[RESOLVER] Starting REAL atomic swap for order ${orderId}`);
  
  try {
    // Step 1: Generate real preimage and hash
    console.log('[RESOLVER] Step 1: Generating cryptographic preimage...');
    const preimage = crypto.randomBytes(32);
    const preimageHex = preimage.toString('hex');
    const preimageHash = crypto.createHash('sha256').update(preimage).digest('hex');
    
    console.log(`[RESOLVER] Preimage: ${preimageHex}`);
    console.log(`[RESOLVER] Hash: ${preimageHash}`);
    
    // Step 2: Create real Bitcoin HTLC
    console.log('[RESOLVER] Step 2: Creating real Bitcoin HTLC...');
    const htlcResponse = await bitcoinService.createHTLC(
      preimageHash,
      "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", // Test public key
      144 // 24 hour timeout
    );
    
    const htlcAddress = htlcResponse.htlc_address;
    console.log(`[RESOLVER] Real Bitcoin HTLC created at: ${htlcAddress}`);
    
    // Step 3: Fund the Bitcoin HTLC with actual Bitcoin
    console.log('[RESOLVER] Step 3: Funding Bitcoin HTLC with real Bitcoin...');
    const fundingResult = await bitcoinService.fundHTLC(htlcAddress, bitcoinAmount);
    console.log(`[RESOLVER] Bitcoin HTLC funded with txid: ${fundingResult.txid}`);
    
    // Step 4: Register with relayer for Ethereum escrow creation
    console.log('[RESOLVER] Step 4: Registering with relayer...');
    const orderHash = ethers.keccak256(ethers.toUtf8Bytes(orderId));
    const preimageBytes32 = '0x' + preimageHash;
    
    await axios.post(`${RELAYER_API}/monitor-swap`, {
      orderId,
      orderHash,
      htlcAddress,
      maker: resolver.address,
      receiver: userAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      htlcHashlock: preimageBytes32,
      htlcTimeout: Math.floor(Date.now() / 1000) + 3600,
      bitcoinTxid: fundingResult.txid
    });
    
    // Step 5: Wait for Bitcoin confirmation and Ethereum escrow creation
    console.log('[RESOLVER] Step 5: Waiting for Bitcoin confirmation...');
    await bitcoinService.waitForConfirmations(fundingResult.txid, 1);
    
    console.log('[RESOLVER] Step 6: Waiting for Ethereum escrow creation...');
    let escrowAddress = null;
    for (let i = 0; i < 12; i++) { // Wait up to 60 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const statusResponse = await axios.get(`${RELAYER_API}/swap-status/${orderId}`);
        if (statusResponse.data.escrowAddress) {
          escrowAddress = statusResponse.data.escrowAddress;
          break;
        }
      } catch (error) {
        console.log('[RESOLVER] Still waiting for escrow creation...');
      }
    }
    
    if (!escrowAddress) {
      throw new Error('Ethereum escrow was not created within timeout');
    }
    
    console.log(`[RESOLVER] Ethereum escrow created at: ${escrowAddress}`);
    
    // Step 7: Fund the Ethereum escrow with real ETH
    console.log('[RESOLVER] Step 7: Funding Ethereum escrow with real ETH...');
    const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
    const fundTx = await escrow.createHTLC({ 
      value: ethers.parseEther(ethereumAmount.toString()),
      gasLimit: 300000
    });
    await fundTx.wait();
    console.log(`[RESOLVER] Ethereum escrow funded with txid: ${fundTx.hash}`);
    
    // Step 8: Simulate user claiming (in real scenario, user would do this)
    console.log('[RESOLVER] Step 8: Demonstrating claim process...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
    
    // User claims Ethereum side first
    const claimTx = await escrow.claimHTLC(preimageBytes32, { gasLimit: 200000 });
    await claimTx.wait();
    console.log(`[RESOLVER] Ethereum HTLC claimed with txid: ${claimTx.hash}`);
    
    // Now resolver can claim Bitcoin side (preimage is revealed)
    console.log('[RESOLVER] Step 9: Claiming Bitcoin HTLC...');
    const bitcoinClaimResult = await bitcoinService.claimHTLC(orderId, preimageHex);
    
    // Generate a block to confirm Bitcoin claim
    const newAddress = await bitcoinService.getNewAddress('mining');
    await bitcoinService.generateBlocks(1, newAddress);
    
    res.json({
      message: 'REAL atomic swap completed successfully!',
      orderId,
      preimage: preimageHex,
      preimageHash,
      bitcoin: {
        htlcAddress,
        fundingTxid: fundingResult.txid,
        claimResult: bitcoinClaimResult
      },
      ethereum: {
        escrowAddress,
        fundingTxid: fundTx.hash,
        claimTxid: claimTx.hash
      },
      status: 'COMPLETED',
      note: 'This was a complete atomic swap using real blockchain transactions!'
    });
    
  } catch (error) {
    console.error('[RESOLVER] Error in real atomic swap:', error);
    res.status(500).json({ 
      error: 'Real atomic swap failed',
      details: error.message,
      orderId
    });
  }
});

// Get real Bitcoin blockchain status
app.get('/bitcoin-status', async (req, res) => {
  try {
    const blockHeight = await bitcoinService.getBlockHeight();
    const balance = await bitcoinService.getBalance();
    
    res.json({
      blockHeight,
      balance,
      network: 'regtest',
      rpcUrl: bitcoinService.rpcUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Bitcoin status', details: error.message });
  }
});

// Fund Bitcoin wallet (regtest only)
app.post('/bitcoin-fund', async (req, res) => {
  try {
    const newAddress = await bitcoinService.getNewAddress('funding');
    const blockHashes = await bitcoinService.generateBlocks(10, newAddress);
    const balance = await bitcoinService.getBalance();
    
    res.json({
      message: 'Bitcoin wallet funded',
      address: newAddress,
      blocksGenerated: blockHashes.length,
      newBalance: balance
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fund Bitcoin wallet', details: error.message });
  }
});

// Simulate complete atomic swap flow
app.post('/demo-atomic-swap', async (req, res) => {
  const { orderId, bitcoinAmount, ethereumAmount } = req.body;
  
  console.log(`[RESOLVER] Starting demo atomic swap for order ${orderId}`);
  
  try {
    // Step 1: Generate merkle tree for order chunking
    console.log('[RESOLVER] Step 1: Generating merkle tree for 100 chunks...');
    const { secrets, hashedSecrets } = merkleDemo.generateOrderSecrets();
    const { tree, root } = merkleDemo.buildMerkleTree(hashedSecrets);
    const merkleRoot = '0x' + root.toString('hex');
    console.log(`[RESOLVER] Merkle root: ${merkleRoot}`);
    
    // Step 2: Create Bitcoin HTLC with merkle root
    console.log('[RESOLVER] Step 2: Creating Bitcoin HTLC...');
    // Ensure we have a valid hash (use first 32 bytes of merkle root)
    const preimageHash = root.toString('hex').substring(0, 64) || "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925";
    
    const htlcResponse = await axios.post(`${BITCOIN_API}/htlc/create`, {
      preimage_hash: preimageHash,
      user_public_key: "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
      timeout_blocks: 144
    }, {
      headers: {
        'X-API-Key': 'demo-key-123'
      }
    });
    
    const htlcAddress = htlcResponse.data.htlc_address;
    console.log(`[RESOLVER] Bitcoin HTLC created at: ${htlcAddress}`);
    
    // Step 3: Register with relayer
    console.log('[RESOLVER] Step 3: Registering with relayer...');
    const orderHash = ethers.keccak256(ethers.toUtf8Bytes(orderId));
    await axios.post(`${RELAYER_API}/monitor-swap`, {
      orderId,
      orderHash,
      htlcAddress,
      maker: resolver.address,
      receiver: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      htlcHashlock: merkleRoot,
      htlcTimeout: Math.floor(Date.now() / 1000) + 3600
    });
    
    // Step 4: Simulate Bitcoin funding
    console.log('[RESOLVER] Step 4: Simulating Bitcoin funding...');
    await axios.post(`${RELAYER_API}/simulate-bitcoin-funding/${orderId}`);
    
    // Wait for Ethereum escrow creation
    console.log('[RESOLVER] Step 5: Waiting for Ethereum escrow...');
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // Get swap status
    const statusResponse = await axios.get(`${RELAYER_API}/swap-status/${orderId}`);
    const escrowAddress = statusResponse.data.escrowAddress;
    
    if (escrowAddress) {
      console.log(`[RESOLVER] Ethereum escrow created at: ${escrowAddress}`);
      
      // Step 6: Simulate partial fulfillment scenarios
      console.log('[RESOLVER] Step 6: Simulating partial fulfillment with competing takers...');
      const partialFills = merkleDemo.simulatePartialFulfillment(secrets, tree, 'progressive');
      const completeFills = merkleDemo.simulateChunkFilling(secrets, tree);
      
      res.json({
        message: 'Demo atomic swap initiated with partial fulfillment capability',
        orderId,
        bitcoinHTLC: htlcAddress,
        ethereumEscrow: escrowAddress,
        merkleRoot,
        totalChunks: 100,
        status: 'READY_FOR_EXECUTION',
        partialFulfillment: {
          enabled: true,
          scenarios: ['progressive', 'competing', 'partial_only'],
          currentScenario: 'progressive',
          steps: partialFills.map(step => ({
            step: step.step,
            taker: step.taker,
            fillPercent: step.fillPercent,
            totalFilled: step.totalFilled,
            chunksRange: step.chunksRange
          }))
        },
        demo: {
          message: "Order with partial fulfillment - takers can fill any portion",
          competingTakers: completeFills.length,
          secretsGenerated: 101,
          merkleTreeDepth: tree.getDepth(),
          keyFeatures: [
            "Multiple takers competing for best rates",
            "Partial order fulfillment supported",
            "Progressive filling from 0% to completion",
            "Any taker can fill any available chunks"
          ]
        }
      });
    } else {
      throw new Error('Ethereum escrow not created');
    }
    
  } catch (error) {
    console.error('[RESOLVER] Error in demo atomic swap:', error);
    res.status(500).json({ error: 'Demo atomic swap failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[RESOLVER] Thunder Portal Resolver running on port ${PORT}`);
  console.log(`[RESOLVER] Ready to execute atomic swaps`);
  console.log(`[RESOLVER] Connected to:`);
  console.log(`  - Bitcoin API: ${BITCOIN_API}`);
  console.log(`  - Relayer API: ${RELAYER_API}`);
  console.log(`  - Ethereum RPC: ${ETHEREUM_RPC}`);
});