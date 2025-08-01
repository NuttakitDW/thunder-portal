import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Table, Spinner } from '../utils/ink-imports.js';
import { getSwapHistory } from '../services/api.js';

interface SwapHistoryProps {
    onBack: () => void;
}

interface SwapRecord {
    orderId: string;
    date: string;
    direction: string;
    amount: string;
    status: string;
}

export const SwapHistory: React.FC<SwapHistoryProps> = ({ onBack }) => {
    const [history, setHistory] = useState<SwapRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useInput((input) => {
        if (input === 'q' || input === 'b') {
            onBack();
        }
    });

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getSwapHistory();
                setHistory(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <Box>
                <Text color="cyan">
                    <Spinner type="dots" /> Loading swap history...
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

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text bold color="cyan">📜 Swap History</Text>
            </Box>
            
            {history.length === 0 ? (
                <Box>
                    <Text dimColor>No swaps found</Text>
                </Box>
            ) : (
                <Box borderStyle="single" borderColor="cyan">
                    <Table
                        data={history.map(swap => ({
                            'Order ID': swap.orderId.substring(0, 8) + '...',
                            'Date': swap.date,
                            'Direction': swap.direction,
                            'Amount': swap.amount,
                            'Status': swap.status === 'completed' ? '✅' : 
                                     swap.status === 'failed' ? '❌' : '⏳'
                        }))}
                    />
                </Box>
            )}
            
            <Box marginTop={1}>
                <Text dimColor>Press 'q' to go back to menu</Text>
            </Box>
        </Box>
    );
};