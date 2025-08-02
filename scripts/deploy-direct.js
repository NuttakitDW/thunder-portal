const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "./doc/testnet-wallets/.env.testnet" });

// Contract ABI and Bytecode
const contractPath = path.join(__dirname, "../artifacts/contracts/SimpleEscrowFactory.sol/SimpleEscrowFactory.json");
const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));

async function main() {
  console.log("🚀 Direct deployment to Sepolia testnet...");
  
  try {
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.ETH_RESOLVER_PRIVATE_KEY, provider);
    
    console.log("Deploying from:", wallet.address);
    
    // Check balance
    const balance = await wallet.getBalance();
    const balanceInEth = ethers.utils.formatEther(balance);
    console.log("Balance:", balanceInEth, "ETH");
    
    if (parseFloat(balanceInEth) < 0.01) {
      throw new Error("Insufficient balance for deployment");
    }
    
    // Deploy contract
    console.log("\n📦 Deploying SimpleEscrowFactory...");
    const factory = new ethers.ContractFactory(
      contractJson.abi,
      contractJson.bytecode,
      wallet
    );
    
    const contract = await factory.deploy();
    console.log("Transaction hash:", contract.deployTransaction.hash);
    console.log("Waiting for deployment...");
    
    await contract.deployed();
    console.log("✅ Contract deployed to:", contract.address);
    console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + contract.address);
    
    // Save deployment info
    const deployments = {
      network: "sepolia",
      contracts: {
        SimpleEscrowFactory: {
          address: contract.address,
          deployedAt: new Date().toISOString(),
          deployer: wallet.address,
          txHash: contract.deployTransaction.hash
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
    
    // Update resolver config
    const resolverEnvPath = path.join(__dirname, "..", "resolver", ".env");
    if (fs.existsSync(resolverEnvPath)) {
      let resolverEnv = fs.readFileSync(resolverEnvPath, "utf8");
      resolverEnv = resolverEnv.replace(
        /ESCROW_FACTORY_ADDRESS=.*/,
        `ESCROW_FACTORY_ADDRESS=${contract.address}`
      );
      fs.writeFileSync(resolverEnvPath, resolverEnv);
    }
    
    console.log("\n✅ Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. make restart");
    console.log("2. make swap-testnet");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();