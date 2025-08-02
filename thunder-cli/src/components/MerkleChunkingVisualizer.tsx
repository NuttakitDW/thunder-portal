import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface MerkleChunkingProps {
    orderAmount: number;
    asset: string;
    totalChunks: number;
    isProcessing: boolean;
}

const MerkleChunkingVisualizer: React.FC<MerkleChunkingProps> = ({
    orderAmount,
    asset,
    totalChunks,
    isProcessing
}) => {
    const [processedChunks, setProcessedChunks] = useState(0);
    const [merkleRoot, setMerkleRoot] = useState<string>('');
    const [secrets, setSecrets] = useState<string[]>([]);

    useEffect(() => {
        if (isProcessing) {
            // Generate merkle root
            setMerkleRoot('0x7f3a9c...8d4e2b');
            
            // Simulate chunk processing
            const interval = setInterval(() => {
                setProcessedChunks(prev => {
                    if (prev >= totalChunks) {
                        clearInterval(interval);
                        return totalChunks;
                    }
                    return prev + Math.floor(Math.random() * 10) + 5;
                });
            }, 500);

            // Generate some sample secrets
            const sampleSecrets = [
                '0xa1b2c3...def012',
                '0x345678...9abcde',
                '0xfedcba...987654',
                '0x112233...445566',
                '0x778899...aabbcc'
            ];
            setSecrets(sampleSecrets);

            return () => clearInterval(interval);
        }
    }, [isProcessing, totalChunks]);

    const chunkSize = orderAmount / totalChunks;
    const progressPercentage = (processedChunks / totalChunks * 100).toFixed(0);

    // Create visual representation of chunks
    const renderChunkGrid = () => {
        const rows = 10;
        const cols = 10;
        const grid = [];

        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const chunkIndex = i * cols + j;
                const isFilled = chunkIndex < processedChunks;
                row.push(
                    <Text key={`${i}-${j}`} color={isFilled ? 'green' : 'gray'}>
                        {isFilled ? '█' : '□'}
                    </Text>
                );
            }
            grid.push(
                <Box key={i}>
                    {row}
                </Box>
            );
        }
        return grid;
    };

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="magenta">🌳 MERKLE TREE CHUNKING</Text>
            </Box>

            <Box flexDirection="column">
                <Box marginBottom={1}>
                    <Text>Order: </Text>
                    <Text bold>{orderAmount} {asset}</Text>
                    <Text> → </Text>
                    <Text bold color="cyan">{totalChunks} chunks</Text>
                    <Text color="gray"> @ {chunkSize.toFixed(4)} {asset} each</Text>
                </Box>

                {merkleRoot && (
                    <Box marginBottom={1}>
                        <Text>Merkle Root: </Text>
                        <Text color="yellow">{merkleRoot}</Text>
                    </Box>
                )}

                <Box flexDirection="column" marginBottom={1}>
                    <Text color="gray">Chunk Visualization ({progressPercentage}% processed):</Text>
                    <Box flexDirection="column" marginTop={1}>
                        {renderChunkGrid()}
                    </Box>
                </Box>

                <Box flexDirection="column" marginBottom={1}>
                    <Text bold>Key Features:</Text>
                    <Box marginLeft={2}>
                        <Text color="green">• 100 chunks for optimal liquidity</Text>
                    </Box>
                    <Box marginLeft={2}>
                        <Text color="green">• Each chunk independently verifiable</Text>
                    </Box>
                    <Box marginLeft={2}>
                        <Text color="green">• Progressive revelation enforced</Text>
                    </Box>
                    <Box marginLeft={2}>
                        <Text color="green">• No double-spend via MerkleStorageInvalidator</Text>
                    </Box>
                </Box>

                {secrets.length > 0 && (
                    <Box flexDirection="column">
                        <Text color="gray">Sample Leaf Hashes:</Text>
                        {secrets.slice(0, 3).map((secret, idx) => (
                            <Box key={idx} marginLeft={2}>
                                <Text color="gray">Leaf {idx}: </Text>
                                <Text color="cyan">{secret}</Text>
                            </Box>
                        ))}
                        <Box marginLeft={2}>
                            <Text color="gray">... 98 more leaves</Text>
                        </Box>
                    </Box>
                )}

                {processedChunks === totalChunks && (
                    <Box marginTop={1}>
                        <Text bold color="green">✓ All chunks generated and ready for matching!</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default MerkleChunkingVisualizer;