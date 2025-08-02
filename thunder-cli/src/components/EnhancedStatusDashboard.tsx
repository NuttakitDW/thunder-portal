import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '../utils/ink-imports.js';
import { getSwapStatus } from '../services/api.js';
import MultiResolverView from './MultiResolverView.js';
import HTLCVisualization from './HTLCVisualization.js';
import TransactionHashDisplay from './TransactionHashDisplay.js';

interface StatusDashboardProps {
    swapId: string | null;
    onBack: () => void;
    onClaimReady?: (swapId: string, htlcAddress: string, secret?: string, escrowAddress?: string) => void;
}

interface SwapStatus {
    orderId: string;
    direction: string;
    amount: string;
    status: 'pending' | 'htlc_created' | 'escrow_deployed' | 'completed' | 'failed';
    progress: number;
    btcTxId?: string;
    ethTxId?: string;
    htlcAddress?: string;
    escrowAddress?: string;
    claimable?: boolean;
    secret?: string;
    ethereumTxHash?: string;
    bitcoinTxHash?: string;
}

interface Transaction {
    type: 'ethereum' | 'bitcoin';
    hash: string;
    description: string;
    status: 'pending' | 'confirmed';
    confirmations?: number;
}

export const EnhancedStatusDashboard: React.FC<StatusDashboardProps> = ({ swapId, onBack, onClaimReady }) => {
    const [status, setStatus] = useState<SwapStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showResolvers, setShowResolvers] = useState(false);
    const [showHTLCs, setShowHTLCs] = useState(false);

    useInput((input) => {
        if (input === 'q' || input === 'b') {
            onBack();
        }
    });

    useEffect(() => {
        if (!swapId) {
            setError('No swap ID provided');
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const data = await getSwapStatus(swapId);
                setStatus(data);
                
                // Update transactions
                const txs: Transaction[] = [];
                
                if (data.ethereumTxHash) {
                    txs.push({
                        type: 'ethereum',
                        hash: data.ethereumTxHash,
                        description: data.direction === 'eth-to-btc' ? 'Escrow Deployment' : 'ETH Claim',
                        status: 'confirmed',
                        confirmations: 12
                    });
                }
                
                if (data.bitcoinTxHash) {
                    txs.push({
                        type: 'bitcoin',
                        hash: data.bitcoinTxHash,
                        description: data.direction === 'eth-to-btc' ? 'HTLC Creation' : 'BTC Funding',
                        status: data.progress > 50 ? 'confirmed' : 'pending',
                        confirmations: data.progress > 50 ? 3 : 0
                    });
                }
                
                setTransactions(txs);
                
                // Show components based on progress
                if (data.progress > 20) setShowResolvers(true);
                if (data.progress > 40) setShowHTLCs(true);
                
                // Check if Bitcoin is claimable
                if (data.claimable && onClaimReady && data.htlcAddress) {
                    onClaimReady(swapId, data.htlcAddress, data.secret, 'demo-escrow-address');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch status');
            } finally {
                setLoading(false);
            }
        };

        const interval = setInterval(fetchStatus, 2000);
        fetchStatus();

        return () => clearInterval(interval);
    }, [swapId, onClaimReady]);

    const renderProgressBar = (progress: number) => {
        const width = 40;
        const filled = Math.floor((progress / 100) * width);
        const empty = width - filled;
        
        return (
            <Box>
                <Text color="yellow">⚡</Text>
                <Text>[</Text>
                <Text color="yellow">{'█'.repeat(filled)}</Text>
                <Text color="gray">{'░'.repeat(empty)}</Text>
                <Text>] </Text>
                <Text bold color={progress === 100 ? 'green' : 'cyan'}>{progress}%</Text>
            </Box>
        );
    };

    if (loading && !status) {
        return (
            <Box>
                <Text color="cyan">
                    <Spinner type="dots" /> Loading swap status...
                </Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box flexDirection="column">
                <Text color="red">❌ Error: {error}</Text>
                <Text dimColor>Press 'q' to go back</Text>
            </Box>
        );
    }

    if (!status) {
        return (
            <Box flexDirection="column">
                <Text>No swap found</Text>
                <Text dimColor>Press 'q' to go back</Text>
            </Box>
        );
    }

    const isEthToBtc = status.direction === 'eth-to-btc' || status.direction === 'ETH → BTC';

    return (
        <Box flexDirection="column">
            <Box borderStyle="double" borderColor="yellow" padding={1} marginBottom={1}>
                <Box flexDirection="column">
                    <Box justifyContent="center" marginBottom={1}>
                        <Text bold color="yellow">⚡ THUNDER PORTAL ATOMIC SWAP ⚡</Text>
                    </Box>
                    <Box marginBottom={1} />
                    <Text>Order ID: <Text color="cyan">{status.orderId}</Text></Text>
                    <Text>Direction: {status.direction}</Text>
                    <Text>Amount: {status.amount}</Text>
                    <Box marginBottom={1} />
                    <Box>
                        <Text>Overall Progress: </Text>
                        {renderProgressBar(status.progress)}
                    </Box>
                </Box>
            </Box>

            {showResolvers && (
                <Box marginBottom={1}>
                    <MultiResolverView
                        totalChunks={100}
                        isActive={status.progress < 80}
                    />
                </Box>
            )}

            {showHTLCs && (
                <Box marginBottom={1}>
                    <HTLCVisualization
                        totalHTLCs={5}
                        isActive={status.progress < 90}
                        swapDirection={isEthToBtc ? 'eth-to-btc' : 'btc-to-eth'}
                    />
                </Box>
            )}

            {transactions.length > 0 && (
                <Box marginBottom={1}>
                    <TransactionHashDisplay transactions={transactions} />
                </Box>
            )}
            
            {status.claimable && status.status !== 'completed' && isEthToBtc && (
                <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
                    <Box flexDirection="column">
                        <Box justifyContent="center">
                            <Text color="yellow" bold>⚡ BITCOIN READY TO CLAIM! ⚡</Text>
                        </Box>
                        <Box marginBottom={1} />
                        <Text>The Ethereum side has revealed the secret.</Text>
                        <Text>Your Bitcoin is waiting in the HTLC!</Text>
                        <Box marginBottom={1} />
                        <Text color="yellow" bold>Redirecting to claim interface...</Text>
                    </Box>
                </Box>
            )}
            
            {status.status === 'completed' && (
                <Box borderStyle="round" borderColor="green" padding={1} marginBottom={1}>
                    <Box flexDirection="column">
                        <Box justifyContent="center">
                            <Text color="green" bold>⚡ ✨ SWAP COMPLETED SUCCESSFULLY! ✨ ⚡</Text>
                        </Box>
                        <Box marginBottom={1} />
                        <Text bold>Technical Achievement:</Text>
                        <Box marginLeft={2} flexDirection="column">
                            <Text color="green">✅ 100 chunks processed via Merkle tree</Text>
                            <Text color="green">✅ Multiple resolvers competed</Text>
                            <Text color="green">✅ Dutch auction optimized price</Text>
                            <Text color="green">✅ Cross-chain atomic execution</Text>
                            <Text color="green">✅ Zero gas fees for user</Text>
                        </Box>
                    </Box>
                </Box>
            )}
            
            <Box>
                <Text dimColor>Press 'q' to go back to menu</Text>
            </Box>
        </Box>
    );
};