import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface DutchAuctionProps {
    orderAmount: number;
    startPrice: number;
    endPrice: number;
    duration: number; // seconds
    status: 'pending' | 'active' | 'completed';
}

const DutchAuctionVisualizer: React.FC<DutchAuctionProps> = ({
    orderAmount,
    startPrice,
    endPrice,
    duration,
    status
}) => {
    const [currentPrice, setCurrentPrice] = useState(startPrice);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [filledChunks, setFilledChunks] = useState(0);

    useEffect(() => {
        if (status !== 'active') return;

        const interval = setInterval(() => {
            setElapsedTime(prev => {
                const next = prev + 1;
                if (next >= duration) {
                    return duration;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status, duration]);

    useEffect(() => {
        // Calculate price based on elapsed time
        const progress = elapsedTime / duration;
        const priceRange = startPrice - endPrice;
        const newPrice = startPrice - (priceRange * progress);
        setCurrentPrice(newPrice);

        // Simulate chunks being filled as price drops
        const chunksToFill = Math.floor(progress * 30); // Fill up to 30 chunks during auction
        setFilledChunks(chunksToFill);
    }, [elapsedTime, duration, startPrice, endPrice]);

    const priceDropPercentage = ((startPrice - currentPrice) / startPrice * 100).toFixed(1);
    const timeRemaining = duration - elapsedTime;

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="yellow">⚡ DUTCH AUCTION ACTIVE ⚡</Text>
            </Box>

            <Box flexDirection="column">
                <Box marginBottom={1}>
                    <Text>Order: </Text>
                    <Text bold>{orderAmount} ETH → BTC</Text>
                </Box>

                <Box flexDirection="column" marginBottom={1}>
                    <Box>
                        <Text>Start Price: </Text>
                        <Text color="red">{startPrice.toFixed(4)} BTC/ETH</Text>
                    </Box>
                    <Box>
                        <Text>Current Price: </Text>
                        <Text bold color="yellow">{currentPrice.toFixed(4)} BTC/ETH</Text>
                        <Text color="green"> (-{priceDropPercentage}%)</Text>
                    </Box>
                    <Box>
                        <Text>End Price: </Text>
                        <Text color="green">{endPrice.toFixed(4)} BTC/ETH</Text>
                    </Box>
                </Box>

                {status === 'active' && (
                    <>
                        <Box marginBottom={1}>
                            <Text>Time Remaining: </Text>
                            <Text bold color={timeRemaining < 30 ? 'red' : 'cyan'}>
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </Text>
                        </Box>

                        <Box>
                            <Text>Chunks Filled: </Text>
                            <Text bold color="green">{filledChunks}/100</Text>
                            {filledChunks > 0 && <Text color="gray"> (by resolvers)</Text>}
                        </Box>

                        <Box marginTop={1}>
                            <Spinner type="dots" />
                            <Text color="gray"> Resolvers monitoring price...</Text>
                        </Box>
                    </>
                )}

                {status === 'completed' && (
                    <Box marginTop={1}>
                        <Text bold color="green">✓ Auction completed! Best prices secured.</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default DutchAuctionVisualizer;