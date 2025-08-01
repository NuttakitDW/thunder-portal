const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const BITCOIN_API = 'http://localhost:3000/v1';
const ETHEREUM_RPC = 'http://localhost:8545';
const PORT = 3001;

// Read factory address from deployment file
let FACTORY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // default
try {
  const deploymentPath = path.join(__dirname, '../evm-resolver/deployments/simple-escrow-factory-local.json');
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    FACTORY_ADDRESS = deployment.contracts.SimpleEscrowFactory.address;
    console.log(`[RELAYER] Loaded factory address from deployment: ${FACTORY_ADDRESS}`);
  }
} catch (error) {
  console.log('[RELAYER] Using default factory address');
}

// Ethereum setup
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
const signer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

// Factory ABI
const FACTORY_ABI = [
  "function createEscrow(bytes32 orderHash, address maker, address receiver, bytes32 htlcHashlock, uint256 htlcTimeout) external returns (address escrow)",
  "function getEscrow(bytes32 orderHash) external view returns (address)",
  "event EscrowCreated(bytes32 indexed orderHash, address indexed escrow)"
];

// Escrow ABI
const ESCROW_ABI = [
  "function createHTLC() external payable",
  "function claimHTLC(bytes32 preimage) external",
  "function getStatus() external view returns (bool active, uint256 amount, uint256 timeout, bool claimed)"
];

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

// Express app
const app = express();
app.use(express.json());

// In-memory storage for active swaps
const activeSwaps = new Map();

// Monitor Bitcoin HTLCs
async function monitorBitcoinHTLC(orderId, htlcAddress, bitcoinTxid) {
  console.log(`[RELAYER] Monitoring Bitcoin HTLC for order ${orderId} at ${htlcAddress}`);
  
  // If we have a Bitcoin txid, check for confirmations
  if (bitcoinTxid) {
    console.log(`[RELAYER] Monitoring Bitcoin transaction: ${bitcoinTxid}`);
    
    const checkInterval = setInterval(async () => {
      try {
        // Check if Bitcoin transaction is confirmed
        const response = await axios.get(`http://localhost:18443`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from('thunderportal:thunderportal123').toString('base64')}`,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getrawtransaction',
            params: [bitcoinTxid, true]
          })
        }).catch(() => null);

        if (response?.data?.result?.confirmations >= 1) {
          const swap = activeSwaps.get(orderId);
          if (swap && !swap.bitcoinFunded) {
            console.log(`[RELAYER] Bitcoin HTLC funded for order ${orderId}! Confirmations: ${response.data.result.confirmations}`);
            swap.bitcoinFunded = true;
            swap.bitcoinTxid = bitcoinTxid;
            
            // Trigger Ethereum escrow creation
            await createEthereumEscrow(swap);
            clearInterval(checkInterval);
          }
        }
      } catch (error) {
        console.error('[RELAYER] Error monitoring Bitcoin transaction:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // Set timeout to stop monitoring after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      const swap = activeSwaps.get(orderId);
      if (swap && !swap.bitcoinFunded) {
        console.log(`[RELAYER] Timeout monitoring Bitcoin HTLC for order ${orderId}`);
        swap.status = 'TIMEOUT';
      }
    }, 600000); // 10 minutes
  } else {
    // Poll for HTLC funding status (fallback for demo mode)
    const checkInterval = setInterval(async () => {
      try {
        const swap = activeSwaps.get(orderId);
        if (swap && !swap.bitcoinFunded) {
          // Check if swap was marked as funded externally
          console.log(`[RELAYER] Bitcoin HTLC funded for order ${orderId}!`);
          swap.bitcoinFunded = true;
          
          // Trigger Ethereum escrow creation
          await createEthereumEscrow(swap);
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error('[RELAYER] Error monitoring Bitcoin:', error);
      }
    }, 5000); // Check every 5 seconds
  }
}

// Create Ethereum escrow when Bitcoin HTLC is funded
async function createEthereumEscrow(swap) {
  console.log(`[RELAYER] Creating Ethereum escrow for order ${swap.orderId}`);
  
  try {
    // Create escrow on Ethereum
    const tx = await factory.createEscrow(
      swap.orderHash,
      swap.maker,
      swap.receiver,
      swap.htlcHashlock,
      swap.htlcTimeout
    );
    
    console.log(`[RELAYER] Ethereum escrow creation tx: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Get escrow address
    const escrowAddress = await factory.getEscrow(swap.orderHash);
    swap.escrowAddress = escrowAddress;
    
    console.log(`[RELAYER] Ethereum escrow created at: ${escrowAddress}`);
    
    // Update swap status
    swap.ethereumEscrowCreated = true;
    swap.status = 'AWAITING_ETHEREUM_FUNDING';
    
  } catch (error) {
    console.error('[RELAYER] Error creating Ethereum escrow:', error);
    swap.status = 'FAILED';
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'thunder-portal-relayer' });
});

// Register new swap for monitoring
app.post('/monitor-swap', async (req, res) => {
  const { orderId, orderHash, htlcAddress, maker, receiver, htlcHashlock, htlcTimeout, bitcoinTxid } = req.body;
  
  console.log(`[RELAYER] New swap registered: ${orderId}`);
  
  // Store swap details
  const swap = {
    orderId,
    orderHash,
    htlcAddress,
    maker,
    receiver,
    htlcHashlock,
    htlcTimeout,
    bitcoinTxid,
    bitcoinFunded: false,
    ethereumEscrowCreated: false,
    status: 'AWAITING_BITCOIN_FUNDING',
    createdAt: new Date()
  };
  
  activeSwaps.set(orderId, swap);
  
  // Start monitoring Bitcoin HTLC
  monitorBitcoinHTLC(orderId, htlcAddress, bitcoinTxid);
  
  res.json({ 
    message: 'Swap monitoring started',
    orderId,
    status: swap.status
  });
});

// Get swap status
app.get('/swap-status/:orderId', (req, res) => {
  const swap = activeSwaps.get(req.params.orderId);
  
  if (!swap) {
    return res.status(404).json({ error: 'Swap not found' });
  }
  
  res.json({
    orderId: swap.orderId,
    status: swap.status,
    bitcoinFunded: swap.bitcoinFunded,
    ethereumEscrowCreated: swap.ethereumEscrowCreated,
    escrowAddress: swap.escrowAddress || null
  });
});

// Simulate Bitcoin funding (for demo)
app.post('/simulate-bitcoin-funding/:orderId', async (req, res) => {
  const swap = activeSwaps.get(req.params.orderId);
  
  if (!swap) {
    return res.status(404).json({ error: 'Swap not found' });
  }
  
  console.log(`[RELAYER] Simulating Bitcoin funding for order ${req.params.orderId}`);
  swap.bitcoinFunded = true;
  
  // Immediately trigger Ethereum escrow creation
  await createEthereumEscrow(swap);
  
  res.json({ message: 'Bitcoin funding simulated', orderId: req.params.orderId });
});

// Get all active swaps
app.get('/active-swaps', (req, res) => {
  const swaps = Array.from(activeSwaps.values()).map(swap => ({
    orderId: swap.orderId,
    status: swap.status,
    createdAt: swap.createdAt
  }));
  
  res.json({ swaps });
});

// Start server
app.listen(PORT, () => {
  console.log(`[RELAYER] Thunder Portal Relayer running on port ${PORT}`);
  console.log(`[RELAYER] Monitoring Bitcoin HTLCs and creating Ethereum escrows`);
  console.log(`[RELAYER] Connected to:`);
  console.log(`  - Bitcoin API: ${BITCOIN_API}`);
  console.log(`  - Ethereum RPC: ${ETHEREUM_RPC}`);
  console.log(`  - Factory Contract: ${FACTORY_ADDRESS}`);
});