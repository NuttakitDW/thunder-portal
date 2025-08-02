# Thunder CLI Docker Image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Build the CLI
RUN npm run build

# Make the CLI executable globally
RUN npm link

# Set entrypoint
ENTRYPOINT ["node", "dist/cli.js"]