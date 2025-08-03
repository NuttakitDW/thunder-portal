const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Import services
const merkleDemo = require('./merkle-demo');
const BitcoinService = require('./bitcoin-service');
const executeRealSwap = require('./execute-real-swap');
const executeRealSwapWithLOP = require('./execute-real-swap-with-lop');
const executeRealPartialSwap = require('./execute-real-partial-swap');
const SwapReportService = require('./swap-report-service');
const createSwapReportRoutes = require('./swap-report-routes');
const executeRealSwapWithReporting = require('./execute-real-swap-with-reporting');

// Configuration
const BITCOIN_API = 'http://localhost:3000/v1';
const RELAYER_API = 'http://localhost:3001';
const ETHEREUM_RPC = 'http://localhost:8545';
const PORT = process.env.PORT || 3002;

// Services
const bitcoinService = new BitcoinService();

// Ethereum setup
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
const resolver = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);

// Initialize swap report service
const swapReportService = new SwapReportService(bitcoinService, provider);
swapReportService.init();

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

// Try to load factory address from deployment files
const path = require('path');
const fs = require('fs');

let FACTORY_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"; // fallback
try {
  const deploymentPath = path.join(__dirname, '../deployments/simple-escrow-factory.json');
  const fallbackPath = path.join(__dirname, '../evm-resolver/deployments/simple-escrow-factory-local.json');
  
  if (fs.existsSync(deploymentPath)) {
    const deployment = require(deploymentPath);
    FACTORY_ADDRESS = deployment.contracts.SimpleEscrowFactory.address;
    console.log(`[RESOLVER] Using factory address from deployment: ${FACTORY_ADDRESS}`);
  } else if (fs.existsSync(fallbackPath)) {
    const deployment = require(fallbackPath);
    FACTORY_ADDRESS = deployment.contracts.SimpleEscrowFactory.address;
    console.log(`[RESOLVER] Using factory address from fallback deployment: ${FACTORY_ADDRESS}`);
  } else {
    console.log(`[RESOLVER] Warning: Using hardcoded factory address: ${FACTORY_ADDRESS}`);
  }
} catch (e) {
  console.log(`[RESOLVER] Warning: Could not load factory deployment, using hardcoded address: ${FACTORY_ADDRESS}`);
}

// Express app
const app = express();
app.use(express.json());

// Add swap report routes
const reportRoutes = createSwapReportRoutes(swapReportService);
app.use('/api/reports', reportRoutes);

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
  const { orderId, escrowAddress, preimage, htlcAddress } = req.body;
  
  console.log(`[RESOLVER] Claiming HTLC for order ${orderId}`);
  
  try {
    // Demo mode - simulate successful claim
    if (!escrowAddress || escrowAddress === 'demo-escrow-address') {
      console.log('[RESOLVER] Demo mode: Simulating Bitcoin claim');
      
      // Generate a proper Bitcoin transaction hash format
      // Bitcoin tx hashes are 64 hex chars without 0x prefix
      const timestamp = Date.now().toString(16);
      const randomBytes = crypto.randomBytes(24).toString('hex');
      const bitcoinTxId = (timestamp + randomBytes).padEnd(64, '0').substring(0, 64);
      
      res.json({
        message: 'Bitcoin claimed successfully (demo)',
        orderId,
        txHash: bitcoinTxId,
        btcTxId: bitcoinTxId,
        amount: '0.1 BTC'
      });
      return;
    }
    
    // Real mode - interact with actual contract
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
app.post('/execute-real-swap', executeRealSwapWithReporting(bitcoinService, provider, resolver, swapReportService));

// Execute real atomic swap with 1inch Limit Order Protocol integration
app.post('/execute-real-swap-lop', executeRealSwapWithLOP(bitcoinService, provider, resolver));

// Execute real atomic swap with partial fulfillment
app.post('/execute-real-partial-swap', executeRealPartialSwap(bitcoinService, provider, resolver));

// Get Bitcoin status
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
  
  // Generate orderId if not provided
  const swapOrderId = orderId || `order-demo-${Date.now()}`;
  
  console.log(`[RESOLVER] Starting demo atomic swap for order ${swapOrderId}`);
  
  try {
    // Step 1: Generate merkle tree for order chunking
    console.log('[RESOLVER] Step 1: Generating merkle tree for 100 chunks...');
    const { secrets, hashedSecrets } = merkleDemo.generateOrderSecrets();
    const { tree, root } = merkleDemo.buildMerkleTree(hashedSecrets);
    const merkleRoot = '0x' + root.toString('hex');
    
    console.log(`[RESOLVER] Merkle root: ${merkleRoot}`);
    
    // Step 2: Create Bitcoin HTLC
    console.log('[RESOLVER] Step 2: Creating Bitcoin HTLC...');
    const htlcResponse = await axios.post(`${BITCOIN_API}/htlc/create`, {
      preimage_hash: merkleRoot.slice(2),
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
    const orderHash = ethers.keccak256(ethers.toUtf8Bytes(swapOrderId));
    await axios.post(`${RELAYER_API}/monitor-swap`, {
      orderId: swapOrderId,
      orderHash,
      htlcAddress,
      maker: resolver.address,
      receiver: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      htlcHashlock: merkleRoot,
      htlcTimeout: Math.floor(Date.now() / 1000) + 3600
    });
    
    // Step 4: Simulate Bitcoin funding
    console.log('[RESOLVER] Step 4: Simulating Bitcoin funding...');
    await axios.post(`${RELAYER_API}/simulate-bitcoin-funding/${swapOrderId}`);
    
    // Wait for Ethereum escrow creation
    console.log('[RESOLVER] Step 5: Waiting for Ethereum escrow...');
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // Get swap status
    const statusResponse = await axios.get(`${RELAYER_API}/swap-status/${swapOrderId}`);
    const escrowAddress = statusResponse.data.escrowAddress;
    
    if (escrowAddress) {
      console.log(`[RESOLVER] Ethereum escrow created at: ${escrowAddress}`);
      
      // Step 6: Simulate partial fulfillment scenarios
      console.log('[RESOLVER] Step 6: Simulating partial fulfillment with competing takers...');
      const partialFills = merkleDemo.simulatePartialFulfillment(secrets, tree, 'progressive');
      const completeFills = merkleDemo.simulateChunkFilling(secrets, tree);
      
      res.json({
        message: 'Demo atomic swap initiated with partial fulfillment capability',
        orderId: swapOrderId,
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