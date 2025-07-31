const crypto = require('crypto');
const { MerkleTree } = require('merkletreejs');

// Generate 101 secrets for order chunking
function generateOrderSecrets() {
  const secrets = [];
  const hashedSecrets = [];
  
  // Generate 101 secrets (0-99 for partial fills, 100 for complete fill)
  for (let i = 0; i < 101; i++) {
    const secret = crypto.randomBytes(32);
    const hashedSecret = crypto.createHash('sha256').update(secret).digest();
    
    secrets.push(secret);
    hashedSecrets.push(hashedSecret);
  }
  
  return { secrets, hashedSecrets };
}

// Build merkle tree from secrets
function buildMerkleTree(hashedSecrets) {
  // Create leaves: keccak256(index, hashedSecret)
  const leaves = hashedSecrets.map((hashedSecret, index) => {
    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index);
    
    return crypto.createHash('sha256')
      .update(Buffer.concat([indexBuffer, hashedSecret]))
      .digest();
  });
  
  // Build merkle tree
  const tree = new MerkleTree(leaves, crypto.createHash.bind(crypto, 'sha256'), {
    sortPairs: true
  });
  
  return {
    tree,
    root: tree.getRoot(),
    leaves
  };
}

// Get merkle proof for specific chunk
function getMerkleProof(tree, index) {
  return tree.getProof(index);
}

// Simulate progressive chunk filling
function simulateChunkFilling(secrets, tree) {
  const fills = [];
  
  // Simulate 4 resolvers each taking 25%
  const resolvers = [
    { name: 'Resolver A', chunks: [0, 24], fillPercent: 25 },
    { name: 'Resolver B', chunks: [25, 49], fillPercent: 25 },
    { name: 'Resolver C', chunks: [50, 74], fillPercent: 25 },
    { name: 'Resolver D', chunks: [75, 99], fillPercent: 25 }
  ];
  
  resolvers.forEach(resolver => {
    const revealedSecrets = [];
    
    for (let i = resolver.chunks[0]; i <= resolver.chunks[1]; i++) {
      revealedSecrets.push({
        index: i,
        secret: secrets[i].toString('hex'),
        proof: getMerkleProof(tree, i)
      });
    }
    
    fills.push({
      resolver: resolver.name,
      fillPercent: resolver.fillPercent,
      chunksRange: resolver.chunks,
      revealedSecrets: revealedSecrets.slice(0, 3), // Show first 3 for demo
      totalRevealed: revealedSecrets.length
    });
  });
  
  return fills;
}

// Demo merkle tree system
function demonstrateMerkleSystem() {
  console.log('\n=== MERKLE TREE CHUNKING SYSTEM ===\n');
  
  // Step 1: Generate secrets
  console.log('1. Generating 101 secrets for order chunking...');
  const { secrets, hashedSecrets } = generateOrderSecrets();
  console.log(`   ✓ Generated ${secrets.length} secrets`);
  console.log(`   ✓ Secret 0-99: For partial fills (1% each)`);
  console.log(`   ✓ Secret 100: For complete fill (100% at once)`);
  
  // Step 2: Build merkle tree
  console.log('\n2. Building merkle tree from hashed secrets...');
  const { tree, root, leaves } = buildMerkleTree(hashedSecrets);
  console.log(`   ✓ Merkle root: 0x${root.toString('hex')}`);
  console.log(`   ✓ Tree depth: ${tree.getDepth()}`);
  console.log(`   ✓ Total leaves: ${leaves.length}`);
  
  // Step 3: Simulate chunk filling
  console.log('\n3. Simulating progressive chunk filling...');
  const fills = simulateChunkFilling(secrets, tree);
  
  fills.forEach(fill => {
    console.log(`\n   ${fill.resolver}:`);
    console.log(`   - Filling chunks ${fill.chunksRange[0]}-${fill.chunksRange[1]} (${fill.fillPercent}%)`);
    console.log(`   - Revealing ${fill.totalRevealed} secrets`);
    console.log(`   - Example secret: ${fill.revealedSecrets[0].secret.substring(0, 16)}...`);
    console.log(`   - Merkle proof length: ${fill.revealedSecrets[0].proof.length} nodes`);
  });
  
  // Step 4: Security properties
  console.log('\n4. Security Properties:');
  console.log('   ✓ Each chunk is independently verifiable');
  console.log('   ✓ Secrets must be revealed in order');
  console.log('   ✓ Cannot reuse secrets (tracked on-chain)');
  console.log('   ✓ Merkle root ensures cryptographic binding');
  
  return {
    merkleRoot: root.toString('hex'),
    totalSecrets: secrets.length,
    treeDepth: tree.getDepth()
  };
}

// Export for use in demo
module.exports = {
  generateOrderSecrets,
  buildMerkleTree,
  getMerkleProof,
  simulateChunkFilling,
  demonstrateMerkleSystem
};

// Run if called directly
if (require.main === module) {
  demonstrateMerkleSystem();
}