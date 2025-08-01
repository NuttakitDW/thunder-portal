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

// Limit Order Protocol ABI
const LIMIT_ORDER_PROTOCOL_ABI = [
  "function initiateCrossChainSwap(bytes32 orderHash, uint256 bitcoinAmount, uint256 ethereumAmount) external",
  "function fillOrder(bytes32 orderHash, address maker, address taker, uint256 makingAmount, uint256 takingAmount) external",
  "function isOrderFilled(bytes32 orderHash) external view returns (bool)",
  "function remainingAmount(bytes32) external view returns (uint256)"
];

// Get deployment addresses
const path = require('path');
const fs = require('fs');

// Try to load deployment files, create dummy if not exists
let deploymentInfo = { limitOrderProtocol: "0x0000000000000000000000000000000000000000" };
let factoryDeployment = { contracts: { SimpleEscrowFactory: { address: "0x0000000000000000000000000000000000000000" } } };

const lopPath = path.join(__dirname, '../deployments/limit-order-protocol.json');
const factoryPath = path.join(__dirname, '../evm-resolver/deployments/simple-escrow-factory-local.json');

try {
  if (fs.existsSync(lopPath)) {
    deploymentInfo = require(lopPath);
  } else {
    console.log('[RESOLVER] Warning: limit-order-protocol.json not found, using placeholder address');
  }
} catch (e) {
  console.log('[RESOLVER] Warning: Could not load limit-order-protocol.json:', e.message);
}

try {
  if (fs.existsSync(factoryPath)) {
    factoryDeployment = require(factoryPath);
  } else {
    console.log('[RESOLVER] Warning: simple-escrow-factory-local.json not found, using placeholder address');
  }
} catch (e) {
  console.log('[RESOLVER] Warning: Could not load simple-escrow-factory-local.json:', e.message);
}

const LIMIT_ORDER_PROTOCOL_ADDRESS = deploymentInfo.limitOrderProtocol;
const FACTORY_ADDRESS = factoryDeployment.contracts.SimpleEscrowFactory.address;

// Execute real atomic swap with Limit Order Protocol integration
function executeRealSwapWithLOP(bitcoinService, provider, resolver) {
  return async (req, res) => {
    const { orderId, bitcoinAmount, ethereumAmount, userAddress } = req.body;
    
    console.log(`[RESOLVER] Starting REAL atomic swap with 1inch Limit Order Protocol for order ${orderId}`);
    
    try {
      // Step 1: Generate real preimage and hash
      console.log('[RESOLVER] Step 1: Generating cryptographic preimage...');
      const preimage = crypto.randomBytes(32);
      const preimageHex = preimage.toString('hex');
      const preimageHash = crypto.createHash('sha256').update(preimage).digest('hex');
      const preimageBytes32 = '0x' + preimageHash;
      
      console.log(`[RESOLVER] Preimage: ${preimageHex}`);
      console.log(`[RESOLVER] Hash: ${preimageHash}`);
      
      // Step 2: Create order hash
      const orderHash = ethers.keccak256(ethers.toUtf8Bytes(orderId));
      console.log(`[RESOLVER] Order hash: ${orderHash}`);
      
      // Step 3: Initialize cross-chain swap in Limit Order Protocol
      console.log('[RESOLVER] Step 3: Registering swap with 1inch Limit Order Protocol...');
      const limitOrderProtocol = new ethers.Contract(
        LIMIT_ORDER_PROTOCOL_ADDRESS, 
        LIMIT_ORDER_PROTOCOL_ABI, 
        resolver
      );
      
      // Get current nonce
      let nonce = await provider.getTransactionCount(resolver.address);
      
      const initTx = await limitOrderProtocol.initiateCrossChainSwap(
        orderHash,
        ethers.parseUnits(bitcoinAmount.toString(), 8), // Bitcoin has 8 decimals
        ethers.parseEther(ethereumAmount.toString()),
        { gasLimit: 300000, nonce: nonce++ }
      );
      await initTx.wait();
      console.log(`[RESOLVER] Limit Order Protocol initialized with tx: ${initTx.hash}`);
      
      // Step 4: Create real Bitcoin HTLC
      console.log('[RESOLVER] Step 4: Creating real Bitcoin HTLC...');
      const htlcResponse = await bitcoinService.createHTLC(
        preimageHash,
        "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", // Test public key
        144 // 24 hour timeout
      );
      
      const htlcAddress = htlcResponse.htlc_address;
      console.log(`[RESOLVER] Real Bitcoin HTLC created at: ${htlcAddress}`);
      
      // Step 5: Fund the Bitcoin HTLC with actual Bitcoin
      console.log('[RESOLVER] Step 5: Funding Bitcoin HTLC with real Bitcoin...');
      const fundingResult = await bitcoinService.fundHTLC(htlcAddress, bitcoinAmount);
      console.log(`[RESOLVER] Bitcoin HTLC funded with txid: ${fundingResult.txid}`);
      
      // Step 6: Create Ethereum escrow via Factory
      console.log('[RESOLVER] Step 6: Creating Ethereum escrow...');
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, resolver);
      const timeout = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      const createTx = await factory.createEscrow(
        orderHash,
        resolver.address, // maker
        userAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // receiver
        preimageBytes32,
        timeout,
        { gasLimit: 2000000, nonce: nonce++ }
      );
      
      const receipt = await createTx.wait();
      console.log(`[RESOLVER] Escrow creation tx: ${createTx.hash}`);
      
      // Get escrow address from factory
      const escrowAddress = await factory.escrows(orderHash);
      console.log(`[RESOLVER] Ethereum escrow created at: ${escrowAddress}`);
      
      // Step 7: Fund the Ethereum escrow with real ETH
      console.log('[RESOLVER] Step 7: Funding Ethereum escrow with real ETH...');
      const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
      
      const fundTx = await escrow.createHTLC({ 
        value: ethers.parseEther(ethereumAmount.toString()),
        gasLimit: 300000,
        nonce: nonce++
      });
      await fundTx.wait();
      console.log(`[RESOLVER] Ethereum escrow funded with txid: ${fundTx.hash}`);
      
      // Step 8: Mark order as filled in Limit Order Protocol
      console.log('[RESOLVER] Step 8: Marking order as filled in Limit Order Protocol...');
      const fillTx = await limitOrderProtocol.fillOrder(
        orderHash,
        resolver.address, // maker
        userAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // taker
        ethers.parseEther(ethereumAmount.toString()), // making amount (ETH)
        ethers.parseUnits(bitcoinAmount.toString(), 8), // taking amount (BTC)
        { gasLimit: 300000, nonce: nonce++ }
      );
      await fillTx.wait();
      console.log(`[RESOLVER] Order marked as filled in Limit Order Protocol with tx: ${fillTx.hash}`);
      
      // Step 9: Verify order status in Limit Order Protocol
      const isFilled = await limitOrderProtocol.isOrderFilled(orderHash);
      const remainingAmount = await limitOrderProtocol.remainingAmount(orderHash);
      console.log(`[RESOLVER] Order filled status: ${isFilled}`);
      console.log(`[RESOLVER] Remaining amount: ${ethers.formatEther(remainingAmount)} ETH`);
      
      // Step 10: Demonstrate the atomic swap completion
      console.log('[RESOLVER] Step 10: Atomic swap ready for execution...');
      
      res.json({
        message: 'REAL atomic swap with 1inch Limit Order Protocol setup successfully!',
        orderId,
        orderHash,
        preimage: preimageHex,
        preimageHash,
        bitcoin: {
          htlcAddress,
          fundingTxid: fundingResult.txid,
          amount: `${bitcoinAmount} BTC`
        },
        ethereum: {
          escrowAddress,
          fundingTxid: fundTx.hash,
          amount: `${ethereumAmount} ETH`
        },
        limitOrderProtocol: {
          address: LIMIT_ORDER_PROTOCOL_ADDRESS,
          initTxHash: initTx.hash,
          fillTxHash: fillTx.hash,
          orderFilled: isFilled,
          remainingAmount: ethers.formatEther(remainingAmount)
        },
        status: 'READY',
        instructions: {
          toBitcoin: `To claim Bitcoin: Use preimage ${preimageHex}`,
          toEthereum: `To claim Ethereum: Call claimHTLC(${preimageBytes32}) on escrow`
        }
      });
      
    } catch (error) {
      console.error('[RESOLVER] Error in real atomic swap with LOP:', error);
      res.status(500).json({ 
        error: 'Real atomic swap with Limit Order Protocol failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}

module.exports = executeRealSwapWithLOP;