const executeRealSwap = require('./execute-real-swap');

// Enhanced version of executeRealSwap that includes reporting
function executeRealSwapWithReporting(bitcoinService, provider, resolver, swapReportService) {
  const originalHandler = executeRealSwap(bitcoinService, provider, resolver);
  
  return async (req, res) => {
    // Create a custom response object to intercept the response
    const customRes = {
      status: (code) => {
        customRes.statusCode = code;
        return customRes;
      },
      json: async (data) => {
        // Track the swap if it was successful
        if (!customRes.statusCode || customRes.statusCode === 200) {
          try {
            const swapRecord = await swapReportService.trackSwap({
              orderId: data.orderId,
              preimage: data.preimage,
              preimageHash: data.preimageHash,
              bitcoinAmount: req.body.bitcoinAmount,
              ethereumAmount: req.body.ethereumAmount,
              userAddress: req.body.userAddress,
              bitcoin: data.bitcoin,
              ethereum: data.ethereum,
              status: data.status,
              instructions: data.instructions
            });
            
            // Add swap tracking info to response
            data.swapId = swapRecord.id;
            data.reportUrl = `/api/reports/swaps/${swapRecord.id}`;
          } catch (error) {
            console.error('Failed to track swap:', error);
          }
        }
        
        // Send the actual response
        res.status(customRes.statusCode || 200).json(data);
      }
    };
    
    // Call the original handler with our custom response
    await originalHandler(req, customRes);
  };
}

module.exports = executeRealSwapWithReporting;