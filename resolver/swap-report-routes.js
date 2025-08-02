const express = require('express');

function createSwapReportRoutes(swapReportService) {
  const router = express.Router();

  // Get all swaps
  router.get('/swaps', async (req, res) => {
    try {
      const swaps = await swapReportService.getAllSwaps();
      res.json({
        count: swaps.length,
        swaps
      });
    } catch (error) {
      console.error('Error fetching swaps:', error);
      res.status(500).json({ error: 'Failed to fetch swaps' });
    }
  });

  // Get specific swap details with current on-chain status
  router.get('/swaps/:swapId', async (req, res) => {
    try {
      const { swapId } = req.params;
      const swapDetails = await swapReportService.getSwapDetails(swapId);
      res.json(swapDetails);
    } catch (error) {
      console.error('Error fetching swap details:', error);
      res.status(404).json({ error: 'Swap not found' });
    }
  });

  // Generate comprehensive swap report
  router.post('/swaps/:swapId/report', async (req, res) => {
    try {
      const { swapId } = req.params;
      const report = await swapReportService.generateSwapReport(swapId);
      res.json(report);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // Export swap report in different formats
  router.get('/swaps/:swapId/export', async (req, res) => {
    try {
      const { swapId } = req.params;
      const { format = 'json' } = req.query;
      
      const exportData = await swapReportService.exportReport(swapId, format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="swap_${swapId}_report.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="swap_${swapId}_report.json"`);
      }
      
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  });

  // Get Bitcoin HTLC status
  router.get('/bitcoin/htlc/:address/status', async (req, res) => {
    try {
      const { address } = req.params;
      const status = await swapReportService.getBitcoinHTLCStatus(address);
      res.json(status);
    } catch (error) {
      console.error('Error fetching Bitcoin HTLC status:', error);
      res.status(500).json({ error: 'Failed to fetch HTLC status' });
    }
  });

  // Get Ethereum escrow status
  router.get('/ethereum/escrow/:address/status', async (req, res) => {
    try {
      const { address } = req.params;
      const status = await swapReportService.getEthereumEscrowStatus(address);
      res.json(status);
    } catch (error) {
      console.error('Error fetching Ethereum escrow status:', error);
      res.status(500).json({ error: 'Failed to fetch escrow status' });
    }
  });

  // Get summary statistics
  router.get('/reports/summary', async (req, res) => {
    try {
      const swaps = await swapReportService.getAllSwaps();
      
      const summary = {
        totalSwaps: swaps.length,
        completedSwaps: 0,
        activeSwaps: 0,
        failedSwaps: 0,
        totalBitcoinVolume: 0,
        totalEthereumVolume: 0,
        averageCompletionTime: 0
      };

      // Calculate statistics
      for (const swap of swaps) {
        const details = await swapReportService.getSwapDetails(swap.id);
        const status = swapReportService.determineOverallStatus(details);
        
        if (status === 'COMPLETED') summary.completedSwaps++;
        else if (status === 'ACTIVE') summary.activeSwaps++;
        else if (status === 'ERROR') summary.failedSwaps++;
        
        summary.totalBitcoinVolume += parseFloat(swap.bitcoinAmount || 0);
        summary.totalEthereumVolume += parseFloat(swap.ethereumAmount || 0);
      }

      res.json(summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });

  return router;
}

module.exports = createSwapReportRoutes;