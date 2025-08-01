import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '../utils/ink-imports.js';
import { getSwapStatus } from '../services/api.js';

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
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({ swapId, onBack, onClaimReady }) => {
    const [status, setStatus] = useState<SwapStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                
                // Check if Bitcoin is claimable
                if (data.claimable && onClaimReady && data.htlcAddress) {
                    // Auto-navigate to claim interface when ready
                    // In demo mode, we don't need the real escrow address
                    onClaimReady(swapId, data.htlcAddress, data.secret, 'demo-escrow-address');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch status');
            } finally {
                setLoading(false);
            }
        };

        // Poll every 2 seconds
        const interval = setInterval(fetchStatus, 2000);
        fetchStatus(); // Initial fetch

        return () => clearInterval(interval);
    }, [swapId, onClaimReady]);

    const renderProgressBar = (progress: number) => {
        const width = 30;
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

    const getStatusIcon = (step: string, currentStatus: string) => {
        const steps = ['pending', 'htlc_created', 'escrow_deployed', 'completed'];
        const currentIndex = steps.indexOf(currentStatus);
        const stepIndex = steps.indexOf(step);
        
        if (stepIndex < currentIndex) return <Text color="green">✅</Text>;
        if (stepIndex === currentIndex) return <Text color="yellow">⚡ <Spinner type="dots12" /></Text>;
        return <Text color="gray">○</Text>;
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

    return (
        <Box flexDirection="column">
            <Box borderStyle="double" borderColor="yellow" padding={1} marginBottom={1}>
                <Box flexDirection="column">
                    <Box justifyContent="center" marginBottom={1}>
                        <Text bold color="yellow">⚡ ATOMIC SWAP STATUS ⚡</Text>
                    </Box>
                    <Text> </Text>
                    <Text>Order ID: <Text color="cyan">{status.orderId}</Text></Text>
                    <Text>Direction: {status.direction}</Text>
                    <Text>Amount: {status.amount}</Text>
                    <Text> </Text>
                    <Box>
                        <Text>Progress: </Text>
                        {renderProgressBar(status.progress)}
                    </Box>
                    <Text> </Text>
                    <Box flexDirection="column">
                        <Box>
                            <Text>{getStatusIcon('htlc_created', status.status)} </Text>
                            <Text>Bitcoin HTLC Created</Text>
                        </Box>
                        {status.htlcAddress && (
                            <Box marginLeft={4}>
                                <Text dimColor>{status.htlcAddress}</Text>
                            </Box>
                        )}
                        
                        <Box marginTop={1}>
                            <Text>{getStatusIcon('escrow_deployed', status.status)} </Text>
                            <Text>Ethereum Escrow Deployed</Text>
                        </Box>
                        {status.escrowAddress && (
                            <Box marginLeft={4}>
                                <Text dimColor>{status.escrowAddress}</Text>
                            </Box>
                        )}
                        
                        <Box marginTop={1}>
                            <Text>{getStatusIcon('completed', status.status)} </Text>
                            <Text>Atomic Swap Complete</Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
            
            {status.claimable && status.status !== 'completed' && (
                <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
                    <Box flexDirection="column">
                        <Box justifyContent="center">
                            <Text color="yellow" bold>⚡ BITCOIN READY TO CLAIM! ⚡</Text>
                        </Box>
                        <Text> </Text>
                        <Text>The Ethereum side has revealed the secret.</Text>
                        <Text>Your Bitcoin is waiting in the HTLC!</Text>
                        <Text> </Text>
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
                        <Text> </Text>
                        <Text color="green">Bitcoin TX:</Text>
                        <Text dimColor>{status.btcTxId}</Text>
                        <Text> </Text>
                        <Text color="green">Ethereum TX:</Text>
                        <Text dimColor>{status.ethTxId}</Text>
                    </Box>
                </Box>
            )}
            
            <Box>
                <Text dimColor>Press 'q' to go back to menu</Text>
            </Box>
        </Box>
    );
};