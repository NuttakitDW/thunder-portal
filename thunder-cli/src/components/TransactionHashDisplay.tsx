import React from 'react';
import { Box, Text } from 'ink';

interface Transaction {
    type: 'ethereum' | 'bitcoin';
    hash: string;
    description: string;
    status: 'pending' | 'confirmed';
    confirmations?: number;
}

interface TransactionHashDisplayProps {
    transactions: Transaction[];
}

const TransactionHashDisplay: React.FC<TransactionHashDisplayProps> = ({ transactions }) => {
    const getExplorerUrl = (tx: Transaction) => {
        if (tx.type === 'ethereum') {
            return `https://sepolia.etherscan.io/tx/${tx.hash}`;
        } else {
            return `https://blockstream.info/testnet/tx/${tx.hash}`;
        }
    };

    const truncateHash = (hash: string) => {
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    };

    const getStatusIcon = (status: Transaction['status']) => {
        return status === 'confirmed' ? '✅' : '⏳';
    };

    const getChainIcon = (type: Transaction['type']) => {
        return type === 'ethereum' ? '⟠' : '₿';
    };

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="blue">🔗 TRANSACTION HASHES</Text>
            </Box>

            <Box flexDirection="column">
                {transactions.map((tx, index) => (
                    <Box key={index} flexDirection="column" marginBottom={1}>
                        <Box>
                            <Text color="yellow">{getChainIcon(tx.type)} </Text>
                            <Text bold>{tx.description}</Text>
                        </Box>
                        <Box marginLeft={2}>
                            <Text>{getStatusIcon(tx.status)} </Text>
                            <Text color={tx.status === 'confirmed' ? 'green' : 'yellow'}>
                                {truncateHash(tx.hash)}
                            </Text>
                            {tx.confirmations !== undefined && (
                                <Text color="gray"> ({tx.confirmations} confirmations)</Text>
                            )}
                        </Box>
                        <Box marginLeft={2}>
                            <Text color="cyan" dimColor>
                                {getExplorerUrl(tx)}
                            </Text>
                        </Box>
                    </Box>
                ))}
            </Box>

            <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text color="gray">💡 Tip: Copy URLs to view on block explorer</Text>
            </Box>
        </Box>
    );
};

export default TransactionHashDisplay;