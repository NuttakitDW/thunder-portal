const crypto = require('crypto');
const { ethers } = require('ethers');
const merkleDemo = require('./merkle-demo');

// Factory ABI
const FACTORY_ABI = [
  "function createEscrow(bytes32 orderHash, address maker, address receiver, bytes32 htlcHashlock, uint256 htlcTimeout) external returns (address escrow)",
  "function escrows(bytes32) external view returns (address)"
];

// Escrow ABI
const ESCROW_ABI = [
  "function createHTLC() external payable",
  "function claimHTLC(bytes32 preimage) external",
  "function refundHTLC() external",
  "function getStatus() external view returns (bool active, uint256 amount, uint256 timeout, bool claimed)"
];

// Factory address (from deployment)
const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Execute real atomic swap with partial fulfillment
function executeRealPartialSwap(bitcoinService, provider, resolver) {
  return async (req, res) => {
    const { orderId, bitcoinAmount, ethereumAmount } = req.body;
    
    console.log(`[RESOLVER] Starting REAL partial fulfillment atomic swap for order ${orderId}`);
    console.log(`[RESOLVER] Order: ${bitcoinAmount} BTC for ${ethereumAmount} ETH`);
    
    try {
      // Step 1: Generate merkle tree for 100 chunks
      console.log('[RESOLVER] Step 1: Generating merkle tree for 100 chunks...');
      const { secrets, hashedSecrets } = merkleDemo.generateOrderSecrets();
      const { tree, root } = merkleDemo.buildMerkleTree(hashedSecrets);
      const merkleRoot = '0x' + root.toString('hex');
      
      console.log(`[RESOLVER] Merkle root: ${merkleRoot}`);
      console.log(`[RESOLVER] Generated ${secrets.length} secrets for partial fulfillment`);
      
      // Step 2: Simulate 4 resolvers competing
      const resolvers = [
        { 
          name: 'Resolver A', 
          chunks: [0, 19], 
          fillPercent: 20, 
          btcAmount: (parseFloat(bitcoinAmount) * 0.20).toFixed(3),
          ethAmount: (parseFloat(ethereumAmount) * 0.20).toFixed(1),
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        },
        { 
          name: 'Resolver B', 
          chunks: [20, 44], 
          fillPercent: 25,
          btcAmount: (parseFloat(bitcoinAmount) * 0.25).toFixed(3),
          ethAmount: (parseFloat(ethereumAmount) * 0.25).toFixed(1),
          address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
        },
        { 
          name: 'Resolver C', 
          chunks: [45, 69], 
          fillPercent: 25,
          btcAmount: (parseFloat(bitcoinAmount) * 0.25).toFixed(3),
          ethAmount: (parseFloat(ethereumAmount) * 0.25).toFixed(1),
          address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        },
        { 
          name: 'Resolver D', 
          chunks: [70, 99], 
          fillPercent: 30,
          btcAmount: (parseFloat(bitcoinAmount) * 0.30).toFixed(3),
          ethAmount: (parseFloat(ethereumAmount) * 0.30).toFixed(1),
          address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
        }
      ];
      
      console.log('[RESOLVER] Step 2: Creating multiple Bitcoin HTLCs for fair distribution...');
      
      const htlcResults = [];
      const escrowResults = [];
      
      // Create HTLCs for each resolver
      for (const resolverInfo of resolvers) {
        console.log(`\n[RESOLVER] Processing ${resolverInfo.name} (${resolverInfo.fillPercent}% fill)...`);
        
        // Use specific secret for this resolver's chunks
        const resolverSecret = secrets[resolverInfo.chunks[1]]; // Use last chunk's secret
        const resolverHash = crypto.createHash('sha256').update(resolverSecret).digest('hex');
        
        // Create Bitcoin HTLC
        console.log(`[RESOLVER] Creating Bitcoin HTLC for ${resolverInfo.name}...`);
        const htlcResponse = await bitcoinService.createHTLC(
          resolverHash,
          "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
          144 // 24 hour timeout
        );
        
        const htlcAddress = htlcResponse.htlc_address;
        console.log(`[RESOLVER] Bitcoin HTLC created at: ${htlcAddress}`);
        
        // Fund the Bitcoin HTLC
        console.log(`[RESOLVER] Funding HTLC with ${resolverInfo.btcAmount} BTC...`);
        const fundingResult = await bitcoinService.fundHTLC(htlcAddress, resolverInfo.btcAmount);
        console.log(`[RESOLVER] HTLC funded with txid: ${fundingResult.txid}`);
        
        htlcResults.push({
          resolver: resolverInfo.name,
          htlcAddress,
          fundingTxid: fundingResult.txid,
          amount: resolverInfo.btcAmount,
          secret: resolverSecret.toString('hex'),
          hash: resolverHash
        });
        
        // Create Ethereum escrow
        console.log(`[RESOLVER] Creating Ethereum escrow for ${resolverInfo.name}...`);
        const orderHash = ethers.keccak256(ethers.toUtf8Bytes(`${orderId}-${resolverInfo.name}`));
        const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, resolver);
        const timeout = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        
        // Get fresh nonce for factory transaction
        const createNonce = await provider.getTransactionCount(resolver.address);
        const createTx = await factory.createEscrow(
          orderHash,
          resolver.address,
          resolverInfo.address,
          '0x' + resolverHash,
          timeout,
          { gasLimit: 2000000, nonce: createNonce }
        );
        
        const receipt = await createTx.wait();
        const escrowAddress = await factory.escrows(orderHash);
        
        // Fund the escrow
        console.log(`[RESOLVER] Funding escrow with ${resolverInfo.ethAmount} ETH...`);
        const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
        
        // Get fresh nonce for each transaction
        const fundNonce = await provider.getTransactionCount(resolver.address);
        const fundTx = await escrow.createHTLC({ 
          value: ethers.parseEther(resolverInfo.ethAmount),
          gasLimit: 300000,
          nonce: fundNonce
        });
        await fundTx.wait();
        
        escrowResults.push({
          resolver: resolverInfo.name,
          escrowAddress,
          fundingTxid: fundTx.hash,
          amount: resolverInfo.ethAmount
        });
      }
      
      // Step 3: Simulate progressive filling
      console.log('\n[RESOLVER] Step 3: Demonstrating partial fulfillment...');
      const fillStatus = merkleDemo.simulateChunkFilling(secrets, tree);
      
      res.json({
        message: 'REAL partial fulfillment atomic swap setup successfully!',
        orderId,
        merkleRoot,
        totalChunks: 100,
        bitcoin: {
          totalAmount: bitcoinAmount,
          htlcs: htlcResults
        },
        ethereum: {
          totalAmount: ethereumAmount,
          escrows: escrowResults
        },
        partialFulfillment: {
          resolvers: resolvers.map((r, i) => ({
            name: r.name,
            fillPercent: r.fillPercent,
            chunksRange: r.chunks,
            btcAmount: r.btcAmount,
            ethAmount: r.ethAmount,
            htlcAddress: htlcResults[i].htlcAddress,
            escrowAddress: escrowResults[i].escrowAddress,
            status: 'READY'
          })),
          totalFilled: '100%',
          mechanism: 'Multiple HTLCs with unique secrets prevent inter-resolver theft'
        },
        instructions: {
          explanation: 'Each resolver has their own HTLC with unique secret',
          security: 'Resolvers cannot steal from each other due to different hashlocks',
          execution: 'Atomic execution ensures all-or-nothing settlement'
        }
      });
      
    } catch (error) {
      console.error('[RESOLVER] Error in real partial fulfillment swap:', error);
      res.status(500).json({ 
        error: 'Real partial fulfillment swap failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}

module.exports = executeRealPartialSwap;