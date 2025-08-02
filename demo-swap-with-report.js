#!/usr/bin/env node

const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const RESOLVER_API = 'http://localhost:3002';

/**
 * Demo script showing complete atomic swap flow with reporting
 */
async function demoSwapWithReport() {
  console.log('=== Thunder Portal Atomic Swap Demo with Reporting ===\n');

  try {
    // Step 1: Create a new atomic swap
    console.log('Step 1: Creating atomic swap...');
    const swapRequest = {
      orderId: `demo-swap-${Date.now()}`,
      bitcoinAmount: 0.001,  // 0.001 BTC
      ethereumAmount: 0.01,  // 0.01 ETH
      userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Example address
    };

    const swapResponse = await axios.post(`${RESOLVER_API}/execute-real-swap`, swapRequest);
    const swapData = swapResponse.data;

    console.log('\n✅ Swap created successfully!');
    console.log(`   Swap ID: ${swapData.swapId}`);
    console.log(`   Order ID: ${swapData.orderId}`);
    console.log(`   Preimage Hash: ${swapData.preimageHash}`);
    console.log(`   Bitcoin HTLC: ${swapData.bitcoin.htlcAddress}`);
    console.log(`   Ethereum Escrow: ${swapData.ethereum.escrowAddress}`);

    // Step 2: Check swap status
    console.log('\n\nStep 2: Checking swap status...');
    const statusResponse = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}`);
    const status = statusResponse.data;

    console.log('\n📊 Current Status:');
    console.log(`   Bitcoin: ${status.currentStatus.bitcoin.status} (Balance: ${status.currentStatus.bitcoin.balance} BTC)`);
    console.log(`   Ethereum: ${status.currentStatus.ethereum.status} (Amount: ${status.currentStatus.ethereum.amount} ETH)`);

    // Step 3: Generate comprehensive report
    console.log('\n\nStep 3: Generating comprehensive report...');
    const reportResponse = await axios.post(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/report`);
    const report = reportResponse.data;

    console.log('\n📄 Swap Report:');
    console.log(`   Report ID: ${report.reportId}`);
    console.log(`   Overall Status: ${report.swap.status}`);
    console.log(`   Created At: ${new Date(report.swap.createdAt).toLocaleString()}`);
    
    console.log('\n   Timeline:');
    report.timeline.forEach(event => {
      console.log(`   - ${event.event}: ${event.description || ''}`);
      if (event.txid) console.log(`     TX: ${event.txid}`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n   Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   ⚠️  [${rec.priority}] ${rec.action}`);
        console.log(`      Reason: ${rec.reason}`);
      });
    }

    // Step 4: Export report
    console.log('\n\nStep 4: Exporting reports...');
    
    // JSON export
    const jsonExport = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=json`);
    console.log('   ✅ JSON report exported');

    // CSV export
    const csvExport = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=csv`);
    console.log('   ✅ CSV report exported');

    // Step 5: Check on-chain status
    console.log('\n\nStep 5: Verifying on-chain status...');
    
    // Bitcoin HTLC status
    const btcStatus = await axios.get(`${RESOLVER_API}/api/reports/bitcoin/htlc/${swapData.bitcoin.htlcAddress}/status`);
    console.log('\n   Bitcoin HTLC:');
    console.log(`   - Address: ${btcStatus.data.address}`);
    console.log(`   - Balance: ${btcStatus.data.balance} BTC`);
    console.log(`   - Status: ${btcStatus.data.status}`);
    console.log(`   - Transactions: ${btcStatus.data.transactions.length}`);

    // Ethereum escrow status
    const ethStatus = await axios.get(`${RESOLVER_API}/api/reports/ethereum/escrow/${swapData.ethereum.escrowAddress}/status`);
    console.log('\n   Ethereum Escrow:');
    console.log(`   - Address: ${ethStatus.data.address}`);
    console.log(`   - Amount: ${ethStatus.data.amount} ETH`);
    console.log(`   - Status: ${ethStatus.data.status}`);
    console.log(`   - Active: ${ethStatus.data.active}`);
    console.log(`   - Timeout: ${new Date(ethStatus.data.timeout).toLocaleString()}`);

    // Step 6: Get summary statistics
    console.log('\n\nStep 6: Getting summary statistics...');
    const summary = await axios.get(`${RESOLVER_API}/api/reports/summary`);
    console.log('\n📈 Overall Statistics:');
    console.log(`   Total Swaps: ${summary.data.totalSwaps}`);
    console.log(`   Completed: ${summary.data.completedSwaps}`);
    console.log(`   Active: ${summary.data.activeSwaps}`);
    console.log(`   Failed: ${summary.data.failedSwaps}`);
    console.log(`   Total BTC Volume: ${summary.data.totalBitcoinVolume} BTC`);
    console.log(`   Total ETH Volume: ${summary.data.totalEthereumVolume} ETH`);

    // Instructions for claiming
    console.log('\n\n🔐 To Complete the Swap:');
    console.log(swapData.instructions.toBitcoin);
    console.log(swapData.instructions.toEthereum);

    console.log('\n\n✨ Demo completed successfully!');
    console.log(`\nView the full report at: ${RESOLVER_API}${swapData.reportUrl}`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  demoSwapWithReport().catch(console.error);
}

module.exports = { demoSwapWithReport };