const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');

// Import merkle demo functions
const merkleDemo = require('./merkle-demo');

// Configuration
const BITCOIN_API = 'http://localhost:3000/v1';
const RELAYER_API = 'http://localhost:3001';
const ETHEREUM_RPC = 'http://localhost:8545';
const PORT = 3002;

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
    const htlcResponse = await axios.post(`${BITCOIN_API}/htlc/create`, {
      preimage_hash: root.toString('hex').substring(0, 64), // Use merkle root as hash
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
      
      // Step 6: Simulate chunk filling
      console.log('[RESOLVER] Step 6: Simulating progressive chunk filling...');
      const fills = merkleDemo.simulateChunkFilling(secrets, tree);
      
      res.json({
        message: 'Demo atomic swap initiated with merkle tree chunking',
        orderId,
        bitcoinHTLC: htlcAddress,
        ethereumEscrow: escrowAddress,
        merkleRoot,
        totalChunks: 100,
        chunksPerResolver: 25,
        status: 'READY_FOR_EXECUTION',
        demo: {
          message: "Order split into 100 chunks with merkle tree verification",
          resolvers: fills.length,
          secretsGenerated: 101,
          merkleTreeDepth: tree.getDepth()
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