const crypto = require('crypto');
const { ethers } = require('ethers');

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

// Execute real atomic swap with actual blockchain transactions (simplified)
function executeRealSwap(bitcoinService, provider, resolver) {
  return async (req, res) => {
    const { orderId, bitcoinAmount, ethereumAmount, userAddress } = req.body;
    
    console.log(`[RESOLVER] Starting REAL atomic swap for order ${orderId}`);
    
    try {
      // Step 1: Generate real preimage and hash
      console.log('[RESOLVER] Step 1: Generating cryptographic preimage...');
      const preimage = crypto.randomBytes(32);
      const preimageHex = preimage.toString('hex');
      const preimageHash = crypto.createHash('sha256').update(preimage).digest('hex');
      const preimageBytes32 = '0x' + preimageHash;
      
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
      
      // Step 4: Create Ethereum escrow directly
      console.log('[RESOLVER] Step 4: Creating Ethereum escrow...');
      const orderHash = ethers.keccak256(ethers.toUtf8Bytes(orderId));
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, resolver);
      const timeout = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      const createTx = await factory.createEscrow(
        orderHash,
        resolver.address, // maker
        userAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // receiver
        preimageBytes32,
        timeout,
        { gasLimit: 2000000 }
      );
      
      const receipt = await createTx.wait();
      console.log(`[RESOLVER] Escrow creation tx: ${createTx.hash}`);
      
      // Get escrow address from factory
      const escrowAddress = await factory.escrows(orderHash);
      console.log(`[RESOLVER] Ethereum escrow created at: ${escrowAddress}`);
      
      // Step 5: Fund the Ethereum escrow with real ETH
      console.log('[RESOLVER] Step 5: Funding Ethereum escrow with real ETH...');
      const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
      
      // Get current nonce to avoid nonce issues
      const nonce = await provider.getTransactionCount(resolver.address);
      
      const fundTx = await escrow.createHTLC({ 
        value: ethers.parseEther(ethereumAmount.toString()),
        gasLimit: 300000,
        nonce: nonce
      });
      await fundTx.wait();
      console.log(`[RESOLVER] Ethereum escrow funded with txid: ${fundTx.hash}`);
      
      // Step 6: Demonstrate the atomic swap completion
      console.log('[RESOLVER] Step 6: Atomic swap ready for execution...');
      // In a real scenario, the user would claim with the preimage
      // For demo purposes, we'll just show the successful setup
      
      res.json({
        message: 'REAL atomic swap setup successfully!',
        orderId,
        preimage: preimageHex,
        preimageHash,
        bitcoin: {
          htlcAddress,
          fundingTxid: fundingResult.txid
        },
        ethereum: {
          escrowAddress,
          fundingTxid: fundTx.hash
        },
        status: 'READY',
        instructions: {
          toBitcoin: `To claim Bitcoin: Use preimage ${preimageHex}`,
          toEthereum: `To claim Ethereum: Call claimHTLC(${preimageBytes32}) on escrow`
        }
      });
      
    } catch (error) {
      console.error('[RESOLVER] Error in real atomic swap:', error);
      res.status(500).json({ 
        error: 'Real atomic swap failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}

module.exports = executeRealSwap;