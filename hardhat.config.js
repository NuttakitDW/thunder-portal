
require("dotenv").config({ path: "./.env.testnet" });
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts", // Use simple contracts folder for now
    artifacts: "./artifacts",
    cache: "./cache",
    tests: "./test"
  },
  networks: {
    hardhat: {
      // Commenting out forking for now - will use local hardhat network
      // To enable forking, add your own RPC URL:
      // forking: {
      //   url: "YOUR_ETHEREUM_RPC_URL",
      //   blockNumber: 19000000
      // },
      chainId: 31337, // Hardhat default chain ID
      mining: {
        auto: true,
        interval: 0
      },
      accounts: [
        {
          privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          balance: "10000000000000000000000" // 10,000 ETH
        },
        {
          privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
          balance: "10000000000000000000000"
        }
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.ETH_SEPOLIA_RPC || "https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66",
      accounts: process.env.ETH_RESOLVER_PRIVATE_KEY ? [process.env.ETH_RESOLVER_PRIVATE_KEY] : [],
      chainId: 11155111,
      gas: "auto",
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "94GB5WHZZ6FWJK7VGIMWZCRFNSZK7HA4QJ"
    }
  }
};
