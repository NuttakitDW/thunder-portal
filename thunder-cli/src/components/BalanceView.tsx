import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '../utils/ink-imports.js';
import { getBalances } from '../services/api.js';

interface BalanceViewProps {
    demoMode: boolean;
    onBack: () => void;
}

interface Balances {
    btc: string;
    eth: string;
    btcAddress: string;
    ethAddress: string;
}

export const BalanceView: React.FC<BalanceViewProps> = ({ demoMode, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<Balances | null>(null);
    const [error, setError] = useState<string | null>(null);

    useInput((input) => {
        if (input === 'q' || input === 'b') {
            onBack();
        }
    });

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                if (demoMode) {
                    // Demo mode balances
                    setBalances({
                        btc: '0.5',
                        eth: '10.5',
                        btcAddress: 'bc1qdem0address...',
                        ethAddress: '0xdemo0xaddress...'
                    });
                } else {
                    const data = await getBalances();
                    setBalances(data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch balances');
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();
    }, [demoMode]);

    if (loading) {
        return (
            <Box>
                <Text color="cyan">
                    <Spinner type="dots" /> Loading balances...
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
            <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
                <Box flexDirection="column">
                    <Text bold color="yellow">📊 Current Balances</Text>
                    <Box marginBottom={1} />
                    <Box>
                        <Text color="orange">₿ Bitcoin: </Text>
                        <Text bold>{balances?.btc} BTC</Text>
                    </Box>
                    <Text dimColor>  {balances?.btcAddress}</Text>
                    <Box marginBottom={1} />
                    <Box>
                        <Text color="blue">⟠ Ethereum: </Text>
                        <Text bold>{balances?.eth} ETH</Text>
                    </Box>
                    <Text dimColor>  {balances?.ethAddress}</Text>
                </Box>
            </Box>
            
            <Box>
                <Text dimColor>Press 'q' to go back to menu</Text>
            </Box>
        </Box>
    );
};