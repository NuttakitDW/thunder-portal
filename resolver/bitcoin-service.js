const axios = require('axios');

/**
 * Bitcoin Service for interacting with local regtest node
 */
class BitcoinService {
  constructor() {
    this.rpcUrl = process.env.BITCOIN_RPC_URL || 'http://localhost:18443';
    this.rpcUser = process.env.BITCOIN_RPC_USER || 'thunderportal';
    this.rpcPassword = process.env.BITCOIN_RPC_PASSWORD || 'thunderportal123';
    this.wallet = process.env.BITCOIN_WALLET || 'test_wallet';
    this.apiUrl = process.env.BITCOIN_API_URL || 'http://localhost:3000/v1';
  }

  /**
   * Make RPC call to Bitcoin node
   */
  async rpcCall(method, params = []) {
    const auth = Buffer.from(`${this.rpcUser}:${this.rpcPassword}`).toString('base64');
    
    // Add wallet to RPC URL if it's a wallet-specific call
    const walletMethods = ['listunspent', 'sendrawtransaction', 'getnewaddress', 'getbalance', 'listwallets', 'listtransactions', 'importaddress', 'gettransaction'];
    const url = walletMethods.includes(method) ? `${this.rpcUrl}/wallet/${this.wallet}` : this.rpcUrl;
    
    try {
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(7),
        method,
        params
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(`[BITCOIN-SERVICE] RPC call failed: ${method}`, error.message);
      throw error;
    }
  }

  /**
   * Get current block height
   */
  async getBlockHeight() {
    return await this.rpcCall('getblockcount');
  }

  /**
   * Generate blocks (regtest only)
   */
  async generateBlocks(count, address) {
    return await this.rpcCall('generatetoaddress', [count, address]);
  }

  /**
   * Get new address from wallet
   */
  async getNewAddress(label) {
    return await this.rpcCall('getnewaddress', label ? [label] : []);
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    return await this.rpcCall('getbalance');
  }

  /**
   * List unspent outputs
   */
  async listUnspent(minConf = 0, maxConf = 9999999, addresses = []) {
    return await this.rpcCall('listunspent', [minConf, maxConf, addresses]);
  }

  /**
   * Get raw transaction
   */
  async getRawTransaction(txid, verbose = true) {
    return await this.rpcCall('getrawtransaction', [txid, verbose]);
  }

  /**
   * Send raw transaction
   */
  async sendRawTransaction(txHex) {
    return await this.rpcCall('sendrawtransaction', [txHex]);
  }

  /**
   * Create HTLC via Bitcoin service API
   */
  async createHTLC(preimageHash, userPublicKey, timeoutBlocks) {
    try {
      const response = await axios.post(`${this.apiUrl}/htlc/create`, {
        preimage_hash: preimageHash,
        user_public_key: userPublicKey,
        timeout_blocks: timeoutBlocks
      }, {
        headers: {
          'X-API-Key': process.env.API_KEY || 'demo-key-123'
        }
      });

      return response.data;
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to create HTLC:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fund HTLC by sending Bitcoin to the HTLC address
   */
  async fundHTLC(htlcAddress, amount) {
    try {
      // Create raw transaction to fund HTLC
      const unspent = await this.listUnspent(1);
      if (unspent.length === 0) {
        throw new Error('No unspent outputs available');
      }

      // Use first available UTXO
      const utxo = unspent[0];
      const inputs = [{
        txid: utxo.txid,
        vout: utxo.vout
      }];

      // Calculate outputs (HTLC funding + change)
      const htlcAmountSats = Math.floor(amount * 100000000); // Convert BTC to satoshis
      const fee = 1000; // 1000 sats fee
      const changeAmount = Math.floor(utxo.amount * 100000000) - htlcAmountSats - fee;

      const outputs = {};
      outputs[htlcAddress] = amount;

      if (changeAmount > 0) {
        const changeAddress = await this.getNewAddress('change');
        outputs[changeAddress] = changeAmount / 100000000; // Convert back to BTC
      }

      // Create and sign transaction
      const rawTx = await this.rpcCall('createrawtransaction', [inputs, outputs]);
      const signedTx = await this.rpcCall('signrawtransactionwithwallet', [rawTx]);

      if (!signedTx.complete) {
        throw new Error('Failed to sign transaction');
      }

      // Broadcast transaction
      const txid = await this.sendRawTransaction(signedTx.hex);
      
      // Generate a block to confirm the transaction (regtest only)
      const newAddress = await this.getNewAddress('mining');
      await this.generateBlocks(1, newAddress);

      return {
        txid,
        hex: signedTx.hex,
        funded: true
      };
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to fund HTLC:', error.message);
      throw error;
    }
  }

  /**
   * Check if HTLC is funded
   */
  async checkHTLCFunding(htlcAddress) {
    try {
      const unspent = await this.listUnspent(0, 9999999, [htlcAddress]);
      return {
        funded: unspent.length > 0,
        amount: unspent.reduce((sum, utxo) => sum + utxo.amount, 0),
        utxos: unspent
      };
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to check HTLC funding:', error.message);
      return { funded: false, amount: 0, utxos: [] };
    }
  }

  /**
   * Claim HTLC with preimage
   */
  async claimHTLC(orderId, preimage) {
    try {
      const response = await axios.post(`${this.apiUrl}/htlc/claim`, {
        order_id: orderId,
        preimage: preimage
      }, {
        headers: {
          'X-API-Key': process.env.API_KEY || 'demo-key-123'
        }
      });

      return response.data;
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to claim HTLC:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Monitor transaction confirmations
   */
  async waitForConfirmations(txid, requiredConfirmations = 1, timeoutMs = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const tx = await this.getRawTransaction(txid, true);
        const confirmations = tx.confirmations || 0;
        
        if (confirmations >= requiredConfirmations) {
          return confirmations;
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.log(`[BITCOIN-SERVICE] Transaction ${txid} not found yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error(`Timeout waiting for ${requiredConfirmations} confirmations on ${txid}`);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txid) {
    try {
      const tx = await this.getRawTransaction(txid, true);
      return {
        txid,
        confirmations: tx.confirmations || 0,
        blockHeight: tx.blockheight,
        status: tx.confirmations > 0 ? 'confirmed' : 'pending'
      };
    } catch (error) {
      return {
        txid,
        confirmations: 0,
        status: 'not_found',
        error: error.message
      };
    }
  }

  /**
   * Get balance for a specific address
   */
  async getBalance(address) {
    try {
      const unspent = await this.listUnspent(0, 9999999, [address]);
      return unspent.reduce((sum, utxo) => sum + utxo.amount, 0);
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to get balance:', error.message);
      return 0;
    }
  }

  /**
   * Get transactions for a specific address
   */
  async getTransactions(address) {
    try {
      // Try to import address as watch-only (may fail if already imported)
      try {
        await this.rpcCall('importaddress', [address, '', false]);
      } catch (importError) {
        // Ignore import errors - address might already be imported
      }
      
      // Get all transactions
      const allTxs = await this.rpcCall('listtransactions', ['*', 100, 0, true]);
      
      // Filter for the specific address
      return allTxs.filter(tx => tx.address === address);
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to get transactions:', error.message);
      return [];
    }
  }

  /**
   * Get detailed transaction information
   */
  async getTransactionDetails(txid) {
    try {
      const tx = await this.rpcCall('gettransaction', [txid, true]);
      return tx;
    } catch (error) {
      console.error('[BITCOIN-SERVICE] Failed to get transaction details:', error.message);
      return null;
    }
  }

  /**
   * Alias for rpcCall to maintain compatibility
   */
  async rpc(method, params = []) {
    return this.rpcCall(method, params);
  }
}

module.exports = BitcoinService;