#!/usr/bin/env node

/**
 * Thunder Portal - Sepolia Testnet Demo
 * 
 * This script demonstrates interaction with deployed Sepolia contracts
 * without modifying the existing working services.
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

// Contract addresses on Sepolia
const CONTRACTS = {
  SimpleEscrowFactory: '0x182a69979dDAf5aD9406b1A3138bcAE484E41d06',
  LimitOrderProtocol: '0xEa8CbF5175397686aE471f3f7e523279b927495d'
};

// Minimal ABIs
const FACTORY_ABI = [
  "function createEscrow(bytes32 orderHash, address maker, address receiver, bytes32 htlcHashlock, uint256 htlcTimeout) external returns (address escrow)",
  "function escrows(bytes32) external view returns (address)",
  "event EscrowCreated(bytes32 indexed orderHash, address indexed escrow, address indexed maker)"
];

const ESCROW_ABI = [
  "function createHTLC() external payable",
  "function claimHTLC(bytes32 preimage) external",
  "function getStatus() external view returns (bool active, uint256 amount, uint256 timeout, bool claimed)"
];

// Colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

async function main() {
  console.log(`${colors.cyan}⚡ Thunder Portal - Sepolia Testnet Demo${colors.reset}`);
  console.log(`${colors.cyan}=======================================\n${colors.reset}`);

  // Connect to Sepolia (ethers v5 syntax)
  const provider = new ethers.providers.JsonRpcProvider(
    'https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66'
  );

  // Load resolver wallet (has funds)
  const resolverPrivateKey = '0x10d9248835570af19b9ad9dc4835ae6a57a8c2509c119257344d39b9dfa954bc';
  const resolver = new ethers.Wallet(resolverPrivateKey, provider);

  console.log(`${colors.yellow}Connected to Sepolia${colors.reset}`);
  console.log(`Resolver address: ${resolver.address}`);
  console.log(`Resolver balance: ${ethers.utils.formatEther(await provider.getBalance(resolver.address))} ETH\n`);

  // Connect to factory
  const factory = new ethers.Contract(CONTRACTS.SimpleEscrowFactory, FACTORY_ABI, resolver);

  // Generate preimage and hash
  const preimage = crypto.randomBytes(32);
  const preimageHex = '0x' + preimage.toString('hex');
  const hash = crypto.createHash('sha256').update(preimage).digest();
  const hashHex = '0x' + hash.toString('hex');

  console.log(`${colors.yellow}Creating atomic swap escrow...${colors.reset}`);
  console.log(`Preimage: ${preimageHex.substring(0, 20)}...`);
  console.log(`Hash: ${hashHex.substring(0, 20)}...\n`);

  try {
    // Create escrow
    const orderId = 'demo-' + Date.now();
    const orderHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(orderId));
    const timeout = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    console.log(`Creating escrow on Sepolia...`);
    const tx = await factory.createEscrow(
      orderHash,
      resolver.address, // maker
      '0x36c147F1C7CC81a53DE10F190bac157988c5A175', // receiver (ETH maker wallet)
      hashHex,
      timeout,
      { gasLimit: 500000 }
    );

    console.log(`Transaction sent: ${tx.hash}`);
    console.log(`View on Etherscan: ${colors.cyan}https://sepolia.etherscan.io/tx/${tx.hash}${colors.reset}`);

    // Wait for confirmation
    console.log(`\nWaiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`${colors.green}✅ Escrow created in block ${receipt.blockNumber}${colors.reset}`);

    // Get escrow address
    const escrowAddress = await factory.escrows(orderHash);
    console.log(`\nEscrow contract: ${colors.cyan}https://sepolia.etherscan.io/address/${escrowAddress}${colors.reset}`);

    // Check escrow status
    const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, resolver);
    const status = await escrow.getStatus();
    console.log(`\nEscrow Status:`);
    console.log(`- Active: ${status.active}`);
    console.log(`- Amount: ${ethers.utils.formatEther(status.amount)} ETH`);
    console.log(`- Timeout: ${new Date(Number(status.timeout) * 1000).toLocaleString()}`);

    console.log(`\n${colors.green}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✅ Sepolia testnet demo completed!${colors.reset}`);
    console.log(`${colors.green}════════════════════════════════════════════${colors.reset}`);
    
    console.log(`\n${colors.yellow}What this demonstrates:${colors.reset}`);
    console.log(`1. Real contract deployment on Sepolia testnet`);
    console.log(`2. Escrow creation with HTLC parameters`);
    console.log(`3. On-chain verification via Etherscan`);
    console.log(`4. Integration with Thunder Portal architecture`);

    console.log(`\n${colors.cyan}For full atomic swap demo, run: make thunder${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.yellow}Error: ${error.message}${colors.reset}`);
    
    if (error.message.includes('insufficient funds')) {
      console.log(`\nResolver needs more ETH for gas. Current balance: ${ethers.utils.formatEther(await provider.getBalance(resolver.address))} ETH`);
    }
    
    console.log(`\n${colors.cyan}Fallback: Run 'make thunder' for the working demo${colors.reset}`);
  }
}

// Run the demo
main().catch(console.error);