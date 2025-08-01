const { ethers } = require('ethers');

// Factory ABI
const FACTORY_ABI = [
  "function createEscrow(bytes32 orderHash, address maker, address receiver, bytes32 htlcHashlock, uint256 htlcTimeout) external returns (address escrow)",
  "function escrows(bytes32) external view returns (address)"
];

const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function testEscrowCreation() {
  console.log('Testing escrow creation...');
  
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const wallet = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
  
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
  
  const orderHash = ethers.keccak256(ethers.toUtf8Bytes('test-order-' + Date.now()));
  const hashlock = ethers.keccak256(ethers.toUtf8Bytes('test-secret'));
  const timeout = Math.floor(Date.now() / 1000) + 3600;
  
  console.log('Parameters:');
  console.log('  orderHash:', orderHash);
  console.log('  maker:', wallet.address);
  console.log('  receiver:', wallet.address);
  console.log('  hashlock:', hashlock);
  console.log('  timeout:', timeout);
  
  try {
    console.log('\nCalling createEscrow...');
    const tx = await factory.createEscrow(
      orderHash,
      wallet.address,
      wallet.address,
      hashlock,
      timeout,
      { gasLimit: 500000 }
    );
    
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    const escrowAddress = await factory.escrows(orderHash);
    console.log('Escrow created at:', escrowAddress);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testEscrowCreation().catch(console.error);
