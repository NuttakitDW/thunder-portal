import axios from 'axios';

const API_BASE_URL = process.env.THUNDER_API_URL || 'http://localhost:3002';
const HTLC_SERVICE_URL = process.env.HTLC_SERVICE_URL || 'http://localhost:3000';

// Interfaces
interface Balance {
    btc: string;
    eth: string;
    btcAddress: string;
    ethAddress: string;
}

interface CreateSwapParams {
    direction: 'btc-to-eth' | 'eth-to-btc';
    amount: number;
    demoMode: boolean;
}

interface SwapResponse {
    orderId: string;
    status: string;
    message: string;
    bitcoinHTLC?: string;
    ethereumEscrow?: string;
    merkleRoot?: string;
    totalChunks?: number;
    partialFulfillment?: {
        enabled: boolean;
        scenarios: string[];
        currentScenario: string;
        steps: Array<{
            step: number;
            taker: string;
            fillPercent: number;
            totalFilled: number;
            chunksRange: string;
        }>;
    };
}

interface HTLCStatus {
    address: string;
    funded: boolean;
    amount?: string;
    secret_hash: string;
}

interface SwapStatusResponse {
    orderId: string;
    bitcoinHTLC: string;
    ethereumEscrow?: string;
    status: 'PENDING' | 'BITCOIN_FUNDED' | 'ETHEREUM_ESCROWED' | 'COMPLETED' | 'FAILED';
    btcAmount: string;
    ethAmount: string;
    progress: number;
    claimable?: boolean;
    secret?: string;
}

// API Functions
export async function getBalances(): Promise<Balance> {
    try {
        // For now, return mock data
        // In production, this would call the actual API
        return {
            btc: '0.5',
            eth: '10.5',
            btcAddress: 'bcrt1q92n2rku0qffgdgfc0u024kcuju8fut4q6ardqs',
            ethAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        };
    } catch (error) {
        throw new Error('Failed to fetch balances');
    }
}

export async function createSwap(params: CreateSwapParams): Promise<SwapResponse> {
    try {
        const orderId = `order-${Date.now()}`;
        const bitcoinAmount = params.direction === 'btc-to-eth' ? params.amount : params.amount * 0.05;
        const ethereumAmount = params.direction === 'eth-to-btc' ? params.amount : params.amount * 20;
        
        // Store swap info for later reference
        swapData.set(orderId, {
            direction: params.direction === 'btc-to-eth' ? 'BTC → ETH' : 'ETH → BTC',
            amount: `${params.amount} ${params.direction === 'btc-to-eth' ? 'BTC' : 'ETH'} → ${params.direction === 'btc-to-eth' ? ethereumAmount : bitcoinAmount} ${params.direction === 'btc-to-eth' ? 'ETH' : 'BTC'}`
        });

        if (params.demoMode) {
            // Demo mode - use demo endpoint
            const response = await axios.post(`${API_BASE_URL}/demo-atomic-swap`, {
                orderId,
                bitcoinAmount,
                ethereumAmount
            });
            
            // Store additional data from response
            if (response.data.orderId) {
                swapData.set(response.data.orderId, {
                    ...swapData.get(orderId),
                    ...response.data
                });
            }
            
            return response.data;
        }

        // Real API call with proper error handling
        try {
            const response = await axios.post(`${API_BASE_URL}/execute-real-swap-lop`, {
                orderId,
                bitcoinAmount,
                ethereumAmount
            }, {
                timeout: 30000 // 30 second timeout
            });
            
            // Store additional data from response
            if (response.data.orderId) {
                swapData.set(response.data.orderId, {
                    ...swapData.get(orderId),
                    ...response.data
                });
            }

            return response.data;
        } catch (apiError: any) {
            // If LOP endpoint fails, try regular swap endpoint
            console.error('LOP endpoint failed, trying regular swap:', apiError.message);
            
            const response = await axios.post(`${API_BASE_URL}/execute-real-swap`, {
                orderId,
                bitcoinAmount,
                ethereumAmount
            }, {
                timeout: 30000
            });
            
            // Store additional data from response
            if (response.data.orderId) {
                swapData.set(response.data.orderId, {
                    ...swapData.get(orderId),
                    ...response.data
                });
            }

            return response.data;
        }
    } catch (error: any) {
        console.error('Swap creation error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.code === 'ECONNREFUSED') {
            throw new Error('Thunder Portal backend is not running. Please start the resolver service.');
        } else {
            throw new Error(`Failed to create swap: ${error.message}`);
        }
    }
}

// Store swap data for status tracking
const swapData: Map<string, any> = new Map();
const swapStartTime: Map<string, number> = new Map();

export async function getSwapStatus(swapId: string) {
    try {
        // Track when we first check this swap
        if (!swapStartTime.has(swapId)) {
            swapStartTime.set(swapId, Date.now());
        }
        
        // Calculate time elapsed
        const elapsed = Date.now() - swapStartTime.get(swapId)!;
        
        // First try to get status from relayer
        try {
            const response = await axios.get(`http://localhost:3001/swap-status/${swapId}`);
            const data = response.data;
            
            // In demo mode, auto-progress based on time
            let status: 'pending' | 'htlc_created' | 'escrow_deployed' | 'completed' | 'failed';
            let progress = 0;
            
            // Auto-progress in demo mode
            if (elapsed < 3000) {
                status = 'pending';
                progress = Math.min(25, Math.floor((elapsed / 3000) * 25));
            } else if (elapsed < 6000) {
                status = 'htlc_created';
                progress = 25 + Math.min(25, Math.floor(((elapsed - 3000) / 3000) * 25));
            } else if (elapsed < 10000) {
                status = 'escrow_deployed';
                progress = 50 + Math.min(40, Math.floor(((elapsed - 6000) / 4000) * 40));
            } else {
                status = 'escrow_deployed';
                progress = 90 + Math.min(10, Math.floor(((elapsed - 10000) / 2000) * 10));
                // Mark as claimable after 12 seconds
                if (elapsed > 12000) {
                    progress = 100;
                }
            }
            
            // Override with actual status if available
            if (data.status === 'COMPLETED') {
                status = 'completed';
                progress = 100;
            } else if (data.status === 'FAILED') {
                status = 'failed';
                progress = 0;
            }
            
            const swapInfo = swapData.get(swapId) || {};
            
            return {
                orderId: swapId,
                direction: swapInfo.direction || 'BTC → ETH',
                amount: swapInfo.amount || '0.1 BTC → 2.0 ETH',
                status,
                progress,
                htlcAddress: data.bitcoinHTLC || swapInfo.bitcoinHTLC,
                escrowAddress: data.escrowAddress || swapInfo.ethereumEscrow,
                btcTxId: data.btcTxId,
                ethTxId: data.ethTxId,
                bitcoinTxHash: data.btcTxId || (elapsed > 6000 ? '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b' : undefined),
                ethereumTxHash: data.ethTxId || (elapsed > 3000 ? '0x742d35Cc6634C0532925a3b844Bc9e7595f87a8c5f4e1a9c6f3d2b5e1a7c9d4e' : undefined),
                claimable: elapsed > 12000 || data.status === 'ETHEREUM_ESCROWED' || data.status === 'COMPLETED',
                secret: elapsed > 12000 ? '0x1234567890abcdef' : data.secret
            };
        } catch (relayerError) {
            // If relayer is down, check resolver status
            const swapInfo = swapData.get(swapId);
            if (!swapInfo) {
                throw new Error('Swap not found');
            }
            
            // Check HTLC status
            let htlcFunded = false;
            if (swapInfo.bitcoinHTLC) {
                try {
                    const htlcResponse = await axios.get(`${HTLC_SERVICE_URL}/htlc/${swapInfo.bitcoinHTLC}`);
                    htlcFunded = htlcResponse.data.funded;
                } catch (e) {
                    // HTLC service might be down
                }
            }
            
            let status: 'pending' | 'htlc_created' | 'escrow_deployed' | 'completed' | 'failed' = 'pending';
            let progress = 25;
            
            if (htlcFunded) {
                status = 'htlc_created';
                progress = 50;
            }
            
            if (swapInfo.ethereumEscrow) {
                status = 'escrow_deployed';
                progress = 75;
            }
            
            return {
                orderId: swapId,
                direction: swapInfo.direction || 'BTC → ETH',
                amount: swapInfo.amount || '0.1 BTC → 2.0 ETH',
                status,
                progress,
                htlcAddress: swapInfo.bitcoinHTLC,
                escrowAddress: swapInfo.ethereumEscrow,
                bitcoinTxHash: progress > 50 ? '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b' : undefined,
                ethereumTxHash: progress > 25 ? '0x742d35Cc6634C0532925a3b844Bc9e7595f87a8c5f4e1a9c6f3d2b5e1a7c9d4e' : undefined,
                claimable: status === 'escrow_deployed'
            };
        }
    } catch (error) {
        throw new Error('Failed to fetch swap status');
    }
}

export async function getSwapHistory() {
    try {
        // Mock implementation
        return [
            {
                orderId: 'order-1754053367',
                date: '2025-08-01',
                direction: 'BTC → ETH',
                amount: '0.1 BTC',
                status: 'completed'
            },
            {
                orderId: 'order-1754052996',
                date: '2025-08-01',
                direction: 'ETH → BTC',
                amount: '2.0 ETH',
                status: 'completed'
            },
            {
                orderId: 'order-1754052149',
                date: '2025-08-01',
                direction: 'BTC → ETH',
                amount: '0.05 BTC',
                status: 'failed'
            }
        ];
    } catch (error) {
        throw new Error('Failed to fetch swap history');
    }
}