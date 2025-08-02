const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

// Escrow ABI for reading contract state
const ESCROW_ABI = [
  "function getStatus() external view returns (bool active, uint256 amount, uint256 timeout, bool claimed)"
];

class SwapReportService {
  constructor(bitcoinService, provider) {
    this.bitcoinService = bitcoinService;
    this.provider = provider;
    this.swapHistory = [];
    this.reportDir = path.join(__dirname, 'reports');
  }

  async init() {
    try {
      await fs.mkdir(this.reportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  async trackSwap(swapData) {
    const timestamp = new Date().toISOString();
    const swapRecord = {
      ...swapData,
      timestamp,
      id: `swap_${Date.now()}_${swapData.orderId}`
    };
    this.swapHistory.push(swapRecord);
    await this.saveSwapRecord(swapRecord);
    return swapRecord;
  }

  async saveSwapRecord(record) {
    const filename = path.join(this.reportDir, `${record.id}.json`);
    await fs.writeFile(filename, JSON.stringify(record, null, 2));
  }

  async getSwapDetails(swapId) {
    const swap = this.swapHistory.find(s => s.id === swapId);
    if (!swap) {
      throw new Error(`Swap ${swapId} not found`);
    }

    // Fetch current on-chain status
    const bitcoinStatus = await this.getBitcoinHTLCStatus(swap.bitcoin.htlcAddress);
    const ethereumStatus = await this.getEthereumEscrowStatus(swap.ethereum.escrowAddress);

    return {
      ...swap,
      currentStatus: {
        bitcoin: bitcoinStatus,
        ethereum: ethereumStatus
      }
    };
  }

  async getBitcoinHTLCStatus(htlcAddress) {
    try {
      // Get HTLC balance and transaction history
      const balance = await this.bitcoinService.getBalance(htlcAddress);
      const transactions = await this.bitcoinService.getTransactions(htlcAddress);
      
      // Check if HTLC has been claimed or refunded
      let status = 'FUNDED';
      let claimTx = null;
      let refundTx = null;

      if (balance === 0 && transactions.length > 1) {
        // Check spending transactions
        const spendingTx = transactions.find(tx => tx.category === 'send');
        if (spendingTx) {
          // Analyze the spending transaction to determine if it was a claim or refund
          const txDetails = await this.bitcoinService.getTransactionDetails(spendingTx.txid);
          if (txDetails.vin[0].scriptSig.hex.length > 200) {
            status = 'CLAIMED';
            claimTx = spendingTx.txid;
          } else {
            status = 'REFUNDED';
            refundTx = spendingTx.txid;
          }
        }
      }

      return {
        address: htlcAddress,
        balance,
        status,
        transactions,
        claimTx,
        refundTx
      };
    } catch (error) {
      console.error('Error fetching Bitcoin HTLC status:', error);
      return {
        address: htlcAddress,
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async getEthereumEscrowStatus(escrowAddress) {
    try {
      const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, this.provider);
      const [active, amount, timeout, claimed] = await escrow.getStatus();

      // Get transaction history
      const filter = {
        address: escrowAddress,
        fromBlock: 0,
        toBlock: 'latest'
      };
      const logs = await this.provider.getLogs(filter);

      let status = 'CREATED';
      if (amount > 0n && active) {
        status = 'FUNDED';
      } else if (claimed) {
        status = 'CLAIMED';
      } else if (!active && amount === 0n) {
        status = 'REFUNDED';
      }

      return {
        address: escrowAddress,
        status,
        active,
        amount: ethers.formatEther(amount),
        timeout: new Date(Number(timeout) * 1000).toISOString(),
        claimed,
        logs: logs.length
      };
    } catch (error) {
      console.error('Error fetching Ethereum escrow status:', error);
      return {
        address: escrowAddress,
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async generateSwapReport(swapId) {
    const swapDetails = await this.getSwapDetails(swapId);
    
    const report = {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      swap: {
        id: swapDetails.id,
        orderId: swapDetails.orderId,
        createdAt: swapDetails.timestamp,
        preimageHash: swapDetails.preimageHash,
        status: this.determineOverallStatus(swapDetails)
      },
      bitcoin: {
        htlcAddress: swapDetails.bitcoin.htlcAddress,
        fundingTxid: swapDetails.bitcoin.fundingTxid,
        amount: swapDetails.bitcoinAmount,
        ...swapDetails.currentStatus.bitcoin
      },
      ethereum: {
        escrowAddress: swapDetails.ethereum.escrowAddress,
        fundingTxid: swapDetails.ethereum.fundingTxid,
        amount: swapDetails.ethereumAmount,
        ...swapDetails.currentStatus.ethereum
      },
      timeline: this.generateTimeline(swapDetails),
      recommendations: this.generateRecommendations(swapDetails)
    };

    // Save report
    const reportPath = path.join(this.reportDir, `${report.reportId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  determineOverallStatus(swapDetails) {
    const btcStatus = swapDetails.currentStatus.bitcoin.status;
    const ethStatus = swapDetails.currentStatus.ethereum.status;

    if (btcStatus === 'CLAIMED' && ethStatus === 'CLAIMED') {
      return 'COMPLETED';
    } else if (btcStatus === 'REFUNDED' || ethStatus === 'REFUNDED') {
      return 'REFUNDED';
    } else if (btcStatus === 'ERROR' || ethStatus === 'ERROR') {
      return 'ERROR';
    } else if (btcStatus === 'FUNDED' && ethStatus === 'FUNDED') {
      return 'ACTIVE';
    } else {
      return 'PENDING';
    }
  }

  generateTimeline(swapDetails) {
    const timeline = [];
    
    timeline.push({
      timestamp: swapDetails.timestamp,
      event: 'SWAP_INITIATED',
      description: 'Atomic swap process started'
    });

    if (swapDetails.bitcoin.fundingTxid) {
      timeline.push({
        timestamp: swapDetails.timestamp, // Would need actual timestamp from blockchain
        event: 'BITCOIN_HTLC_FUNDED',
        txid: swapDetails.bitcoin.fundingTxid,
        amount: swapDetails.bitcoinAmount
      });
    }

    if (swapDetails.ethereum.fundingTxid) {
      timeline.push({
        timestamp: swapDetails.timestamp, // Would need actual timestamp from blockchain
        event: 'ETHEREUM_ESCROW_FUNDED',
        txid: swapDetails.ethereum.fundingTxid,
        amount: swapDetails.ethereumAmount
      });
    }

    // Add claim/refund events based on current status
    if (swapDetails.currentStatus.bitcoin.status === 'CLAIMED') {
      timeline.push({
        event: 'BITCOIN_HTLC_CLAIMED',
        txid: swapDetails.currentStatus.bitcoin.claimTx
      });
    }

    if (swapDetails.currentStatus.ethereum.status === 'CLAIMED') {
      timeline.push({
        event: 'ETHEREUM_ESCROW_CLAIMED'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  generateRecommendations(swapDetails) {
    const recommendations = [];
    const overallStatus = this.determineOverallStatus(swapDetails);

    if (overallStatus === 'ACTIVE') {
      const now = Date.now();
      const btcTimeout = swapDetails.currentStatus.bitcoin.timeout;
      const ethTimeout = new Date(swapDetails.currentStatus.ethereum.htlcTimeout).getTime();

      if (ethTimeout - now < 3600000) { // Less than 1 hour
        recommendations.push({
          priority: 'HIGH',
          action: 'Complete swap immediately',
          reason: 'Ethereum escrow timeout approaching'
        });
      }

      if (btcTimeout && btcTimeout - now < 7200000) { // Less than 2 hours
        recommendations.push({
          priority: 'HIGH',
          action: 'Complete or refund swap',
          reason: 'Bitcoin HTLC timeout approaching'
        });
      }
    }

    if (overallStatus === 'ERROR') {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Investigate error and contact support',
        reason: 'Swap encountered an error'
      });
    }

    return recommendations;
  }

  async exportReport(swapId, format = 'json') {
    const report = await this.generateSwapReport(swapId);
    
    if (format === 'csv') {
      return this.convertReportToCSV(report);
    } else if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  convertReportToCSV(report) {
    const rows = [];
    
    // Header
    rows.push(['Field', 'Value']);
    
    // Basic info
    rows.push(['Report ID', report.reportId]);
    rows.push(['Generated At', report.generatedAt]);
    rows.push(['Swap ID', report.swap.id]);
    rows.push(['Order ID', report.swap.orderId]);
    rows.push(['Status', report.swap.status]);
    rows.push(['Preimage Hash', report.swap.preimageHash]);
    
    // Bitcoin details
    rows.push(['', '']); // Empty row
    rows.push(['Bitcoin HTLC Address', report.bitcoin.htlcAddress]);
    rows.push(['Bitcoin Amount', report.bitcoin.amount]);
    rows.push(['Bitcoin Status', report.bitcoin.status]);
    rows.push(['Bitcoin Balance', report.bitcoin.balance]);
    rows.push(['Bitcoin Funding TX', report.bitcoin.fundingTxid]);
    
    // Ethereum details
    rows.push(['', '']); // Empty row
    rows.push(['Ethereum Escrow Address', report.ethereum.escrowAddress]);
    rows.push(['Ethereum Amount', report.ethereum.amount]);
    rows.push(['Ethereum Status', report.ethereum.status]);
    rows.push(['Ethereum Active', report.ethereum.active]);
    rows.push(['Ethereum Funding TX', report.ethereum.fundingTxid]);
    
    // Convert to CSV string
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  async getAllSwaps() {
    // Load all swap records from disk
    try {
      const files = await fs.readdir(this.reportDir);
      const swapFiles = files.filter(f => f.startsWith('swap_') && f.endsWith('.json'));
      
      const swaps = [];
      for (const file of swapFiles) {
        const content = await fs.readFile(path.join(this.reportDir, file), 'utf8');
        swaps.push(JSON.parse(content));
      }
      
      return swaps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error loading swaps:', error);
      return this.swapHistory;
    }
  }
}

module.exports = SwapReportService;