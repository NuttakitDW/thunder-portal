# Ethereum Hardhat Node with Contract Deployment
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Copy package files from evm-resolver
COPY evm-resolver/package*.json ./

# Install dependencies
RUN npm ci

# Copy contracts and scripts
COPY contracts ./contracts
COPY scripts ./scripts
COPY evm-resolver/hardhat.config.js ./
COPY evm-resolver/package*.json ./

# Copy deployment script
COPY ethereum/deploy-contracts.sh ./deploy-contracts.sh
RUN chmod +x deploy-contracts.sh

# Create deployments directory
RUN mkdir -p deployments

# Expose Hardhat port
EXPOSE 8545

# Start Hardhat and deploy contracts
CMD ["sh", "-c", "npx hardhat node --hostname 0.0.0.0 & sleep 10 && ./deploy-contracts.sh && tail -f /dev/null"]