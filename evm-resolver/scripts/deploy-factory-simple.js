const { ethers } = require('ethers');
const fs = require('fs');

// Read contract ABI and bytecode
const factoryArtifact = JSON.parse(fs.readFileSync('./dist/contracts/SimpleEscrowFactory.sol/SimpleEscrowFactory.json', 'utf8'));

async function deploy() {
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  
  console.log('Deploying SimpleEscrowFactory...');
  console.log('Deployer:', wallet.address);
  
  // Deploy factory
  const Factory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode.object,
    wallet
  );
  
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  
  const address = await factory.getAddress();
  console.log('Factory deployed at:', address);
  
  // Save deployment info
  const deployment = {
    network: 'hardhat-local',
    timestamp: new Date().toISOString(),
    contracts: {
      SimpleEscrowFactory: {
        address: address
      }
    }
  };
  
  fs.writeFileSync(
    './deployments/simple-escrow-factory-local.json',
    JSON.stringify(deployment, null, 2)
  );
  
  console.log('Deployment info saved!');
  return address;
}

deploy().catch(console.error);
