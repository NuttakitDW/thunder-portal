import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface HTLC {
    id: string;
    resolver: string;
    amount: number;
    status: 'creating' | 'funded' | 'claimed' | 'refunded';
    bitcoinAddress?: string;
    ethereumContract?: string;
    timeout: number;
}

interface HTLCVisualizationProps {
    totalHTLCs: number;
    isActive: boolean;
    swapDirection: 'eth-to-btc' | 'btc-to-eth';
}

const HTLCVisualization: React.FC<HTLCVisualizationProps> = ({ totalHTLCs, isActive, swapDirection }) => {
    const [htlcs, setHtlcs] = useState<HTLC[]>([]);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        // Initialize HTLCs
        const initialHtlcs: HTLC[] = Array.from({ length: Math.min(totalHTLCs, 5) }, (_, i) => ({
            id: `htlc-${i + 1}`,
            resolver: ['KeeperDAO', 'Wintermute', 'Jump Trading', 'DeFi Resolver', 'MEV Capital'][i],
            amount: 0.2, // Example amount per HTLC
            status: 'creating',
            timeout: 48 * 3600 // 48 hours in seconds
        }));
        setHtlcs(initialHtlcs);

        const interval = setInterval(() => {
            setCurrentTime(prev => prev + 1);
            
            setHtlcs(prevHtlcs => {
                return prevHtlcs.map(htlc => {
                    if (htlc.status === 'creating' && Math.random() > 0.7) {
                        return {
                            ...htlc,
                            status: 'funded',
                            bitcoinAddress: `bc1q${Math.random().toString(36).substring(2, 10)}...`,
                            ethereumContract: `0x${Math.random().toString(16).substring(2, 10)}...`
                        };
                    }
                    if (htlc.status === 'funded' && currentTime > 10 && Math.random() > 0.8) {
                        return { ...htlc, status: 'claimed' };
                    }
                    return htlc;
                });
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [isActive, totalHTLCs, currentTime]);

    const getStatusIcon = (status: HTLC['status']) => {
        switch (status) {
            case 'creating': return '🔨';
            case 'funded': return '💰';
            case 'claimed': return '✅';
            case 'refunded': return '↩️';
        }
    };

    const getStatusColor = (status: HTLC['status']) => {
        switch (status) {
            case 'creating': return 'yellow';
            case 'funded': return 'cyan';
            case 'claimed': return 'green';
            case 'refunded': return 'red';
        }
    };

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="magenta">🔐 HTLC CREATION & MANAGEMENT</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text color="gray">Dual-chain escrow coordination:</Text>
                <Box marginLeft={2}>
                    <Text color="yellow">
                        {swapDirection === 'eth-to-btc' 
                            ? '• Ethereum: EscrowSrc (locks ETH)'
                            : '• Ethereum: EscrowDst (receives ETH)'}
                    </Text>
                </Box>
                <Box marginLeft={2}>
                    <Text color="yellow">
                        {swapDirection === 'eth-to-btc'
                            ? '• Bitcoin: HTLC (receives BTC)'
                            : '• Bitcoin: HTLC (locks BTC)'}
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column">
                {htlcs.map((htlc) => (
                    <Box key={htlc.id} flexDirection="column" marginBottom={1}>
                        <Box>
                            <Text color={getStatusColor(htlc.status)}>
                                {getStatusIcon(htlc.status)} 
                            </Text>
                            <Text bold> HTLC #{htlc.id.split('-')[1]} </Text>
                            <Text color="gray">({htlc.resolver})</Text>
                        </Box>
                        
                        <Box marginLeft={3} flexDirection="column">
                            <Text>Amount: {htlc.amount} BTC</Text>
                            {htlc.bitcoinAddress && (
                                <Text color="cyan">Bitcoin: {htlc.bitcoinAddress}</Text>
                            )}
                            {htlc.ethereumContract && (
                                <Text color="cyan">Ethereum: {htlc.ethereumContract}</Text>
                            )}
                            <Text color="gray">
                                Timeout: {Math.floor(htlc.timeout / 3600)}h 
                                {htlc.status === 'funded' && ' (presigned refund ready)'}
                            </Text>
                        </Box>
                    </Box>
                ))}
            </Box>

            <Box marginTop={1} flexDirection="column">
                <Text bold color="yellow">🔑 Security Features:</Text>
                <Box marginLeft={2} flexDirection="column">
                    <Text color="green">• Same merkle root on both chains</Text>
                    <Text color="green">• Presigned refund transactions</Text>
                    <Text color="green">• Timeout hierarchy (BTC {'>'} ETH)</Text>
                    <Text color="green">• Atomic execution guaranteed</Text>
                </Box>
            </Box>

            {htlcs.filter(h => h.status === 'claimed').length === htlcs.length && (
                <Box marginTop={1}>
                    <Text bold color="green">✅ All HTLCs successfully executed!</Text>
                </Box>
            )}
        </Box>
    );
};

export default HTLCVisualization;