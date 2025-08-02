import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface Resolver {
    id: string;
    name: string;
    reputation: number;
    chunksTargeted: number;
    chunksFilled: number;
    status: 'watching' | 'bidding' | 'filling' | 'completed';
    priceOffered?: number;
}

interface MultiResolverViewProps {
    totalChunks: number;
    isActive: boolean;
}

const MultiResolverView: React.FC<MultiResolverViewProps> = ({ totalChunks, isActive }) => {
    const [resolvers, setResolvers] = useState<Resolver[]>([
        { id: '1', name: 'KeeperDAO', reputation: 95, chunksTargeted: 0, chunksFilled: 0, status: 'watching' },
        { id: '2', name: 'Wintermute', reputation: 98, chunksTargeted: 0, chunksFilled: 0, status: 'watching' },
        { id: '3', name: 'Jump Trading', reputation: 97, chunksTargeted: 0, chunksFilled: 0, status: 'watching' },
        { id: '4', name: 'DeFi Resolver', reputation: 88, chunksTargeted: 0, chunksFilled: 0, status: 'watching' },
        { id: '5', name: 'MEV Capital', reputation: 92, chunksTargeted: 0, chunksFilled: 0, status: 'watching' }
    ]);

    const [totalFilled, setTotalFilled] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setResolvers(prevResolvers => {
                const updated = [...prevResolvers];
                const remainingChunks = totalChunks - totalFilled;

                if (remainingChunks > 0) {
                    // Simulate resolvers competing for chunks
                    updated.forEach((resolver, index) => {
                        if (resolver.status === 'watching' && Math.random() > 0.7) {
                            resolver.status = 'bidding';
                            resolver.chunksTargeted = Math.floor(Math.random() * 30) + 5;
                            resolver.priceOffered = 0.0498 + (Math.random() * 0.0004);
                        } else if (resolver.status === 'bidding' && Math.random() > 0.6) {
                            resolver.status = 'filling';
                        } else if (resolver.status === 'filling' && Math.random() > 0.5) {
                            const chunksToFill = Math.min(
                                resolver.chunksTargeted - resolver.chunksFilled,
                                Math.floor(Math.random() * 5) + 1,
                                remainingChunks
                            );
                            resolver.chunksFilled += chunksToFill;
                            if (resolver.chunksFilled >= resolver.chunksTargeted) {
                                resolver.status = 'completed';
                            }
                        }
                    });
                }

                return updated;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [isActive, totalFilled, totalChunks]);

    useEffect(() => {
        const filled = resolvers.reduce((sum, resolver) => sum + resolver.chunksFilled, 0);
        setTotalFilled(filled);
    }, [resolvers]);

    const getStatusIcon = (status: Resolver['status']) => {
        switch (status) {
            case 'watching': return '👁️ ';
            case 'bidding': return '💰';
            case 'filling': return '⚡';
            case 'completed': return '✅';
        }
    };

    const getStatusColor = (status: Resolver['status']) => {
        switch (status) {
            case 'watching': return 'gray';
            case 'bidding': return 'yellow';
            case 'filling': return 'cyan';
            case 'completed': return 'green';
        }
    };

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="cyan">🏁 RESOLVER COMPETITION</Text>
            </Box>

            <Box flexDirection="column">
                {resolvers.map((resolver) => (
                    <Box key={resolver.id} marginBottom={1}>
                        <Box width={20}>
                            <Text color={getStatusColor(resolver.status)}>
                                {getStatusIcon(resolver.status)} {resolver.name}
                            </Text>
                        </Box>
                        <Box width={15}>
                            <Text color="gray">Rep: {resolver.reputation}%</Text>
                        </Box>
                        {resolver.status !== 'watching' && (
                            <>
                                <Box width={20}>
                                    <Text>
                                        Chunks: {resolver.chunksFilled}/{resolver.chunksTargeted}
                                    </Text>
                                </Box>
                                {resolver.priceOffered && (
                                    <Box>
                                        <Text color="green">
                                            @ {resolver.priceOffered.toFixed(4)} BTC/ETH
                                        </Text>
                                    </Box>
                                )}
                            </>
                        )}
                        {resolver.status === 'filling' && (
                            <Box marginLeft={1}>
                                <Spinner type="dots" />
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>

            <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text>Total Progress: </Text>
                <Text bold color={totalFilled === totalChunks ? 'green' : 'yellow'}>
                    {totalFilled}/{totalChunks} chunks filled
                </Text>
                {totalFilled < totalChunks && isActive && (
                    <Text color="gray"> ({totalChunks - totalFilled} remaining)</Text>
                )}
            </Box>
        </Box>
    );
};

export default MultiResolverView;