const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying contracts to Sepolia testnet...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Deploy SimpleEscrowFactory
  console.log("\n📦 Deploying SimpleEscrowFactory...");
  const SimpleEscrowFactory = await hre.ethers.getContractFactory("SimpleEscrowFactory");
  const factory = await SimpleEscrowFactory.deploy();
  await factory.deployed();
  console.log("✅ SimpleEscrowFactory deployed to:", factory.address);
  
  // Save deployment info
  const deployments = {
    network: "sepolia",
    contracts: {
      SimpleEscrowFactory: {
        address: factory.address,
        deployedAt: new Date().toISOString()
      }
    }
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia-contracts.json"),
    JSON.stringify(deployments, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("📄 Deployment info saved to deployments/sepolia-contracts.json");
  
  // Update service configurations
  console.log("\n🔧 Updating service configurations...");
  
  // Update resolver .env
  const resolverEnvPath = path.join(__dirname, "..", "resolver", ".env");
  let resolverEnv = fs.readFileSync(resolverEnvPath, "utf8");
  resolverEnv = resolverEnv.replace(
    /ESCROW_FACTORY_ADDRESS=.*/,
    `ESCROW_FACTORY_ADDRESS=${factory.address}`
  );
  fs.writeFileSync(resolverEnvPath, resolverEnv);
  
  console.log("✅ Updated resolver service configuration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
