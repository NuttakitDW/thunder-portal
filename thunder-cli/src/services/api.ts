import axios from 'axios';

const API_BASE_URL = process.env.THUNDER_API_URL || 'http://localhost:3002';

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
        if (params.demoMode) {
            // Demo mode - return mock response
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
            return {
                orderId: `order-${Date.now()}`,
                status: 'pending',
                message: 'Atomic swap initiated'
            };
        }

        // Real API call
        const response = await axios.post(`${API_BASE_URL}/execute-real-swap-lop`, {
            orderId: `order-${Date.now()}`,
            bitcoinAmount: params.direction === 'btc-to-eth' ? params.amount : params.amount * 0.05,
            ethereumAmount: params.direction === 'eth-to-btc' ? params.amount : params.amount * 20
        });

        return response.data;
    } catch (error) {
        throw new Error('Failed to create swap');
    }
}

export async function getSwapStatus(swapId: string) {
    try {
        // Mock implementation - in production, this would call the actual API
        const mockProgress = Math.min(100, Math.floor(Math.random() * 20) + 80);
        
        return {
            orderId: swapId,
            direction: 'BTC → ETH',
            amount: '0.1 BTC → 2.0 ETH',
            status: (mockProgress === 100 ? 'completed' : 'escrow_deployed') as 'pending' | 'htlc_created' | 'escrow_deployed' | 'completed' | 'failed',
            progress: mockProgress,
            htlcAddress: '2N9NoM61z5rMZh9euw2SudnNjSyN5eNoare',
            escrowAddress: '0x469656646d9a8589251f4406d54ff6e9eb9dbece',
            btcTxId: mockProgress === 100 ? '43cb487c696249e36dc3fc537c3610c27dcf6a4ce635c8d56ad831edd00ce3c4' : undefined,
            ethTxId: mockProgress === 100 ? '0x4455bd03ade08b4faa834a108f7da8b51b06026acec43a6304df2bacb338aed3' : undefined
        };
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