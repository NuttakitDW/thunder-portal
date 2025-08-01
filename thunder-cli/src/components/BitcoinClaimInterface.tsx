import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectInput, Spinner } from '../utils/ink-imports.js';
import axios from 'axios';

interface BitcoinClaimInterfaceProps {
    swapId: string;
    htlcAddress: string;
    secret?: string;
    escrowAddress?: string;
    onClaimed: () => void;
    onBack: () => void;
}

export const BitcoinClaimInterface: React.FC<BitcoinClaimInterfaceProps> = ({ 
    swapId, 
    htlcAddress, 
    secret,
    escrowAddress,
    onClaimed, 
    onBack 
}) => {
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);

    useInput((input) => {
        if (input === 'q' && !claiming) {
            onBack();
        }
    });

    const handleClaim = async () => {
        setClaiming(true);
        setError(null);

        try {
            // In demo mode, we simulate claiming Bitcoin
            // In real implementation, this would connect to user's wallet
            const response = await axios.post('http://localhost:3002/claim-htlc', {
                orderId: swapId,
                escrowAddress: escrowAddress || 'demo-escrow-address',
                preimage: secret || 'demo-secret-preimage',
                htlcAddress
            });

            if (response.data.txHash) {
                setTxHash(response.data.txHash);
                setTimeout(() => {
                    onClaimed();
                }, 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to claim Bitcoin');
            setClaiming(false);
        }
    };

    const walletOptions = [
        { label: '🦊 Xverse Wallet', value: 'xverse' },
        { label: '🔵 UniSat Wallet', value: 'unisat' },
        { label: '🟣 Leather Wallet', value: 'leather' },
        { label: '⚡ Thunder Test Wallet (Demo)', value: 'demo' }
    ];

    if (claiming && txHash) {
        return (
            <Box flexDirection="column">
                <Box borderStyle="round" borderColor="green" padding={1} marginBottom={1}>
                    <Box flexDirection="column">
                        <Box justifyContent="center" marginBottom={1}>
                            <Text bold color="green">⚡ ✅ BITCOIN CLAIMED SUCCESSFULLY! ✅ ⚡</Text>
                        </Box>
                        <Text>Transaction Hash:</Text>
                        <Text color="cyan">{txHash}</Text>
                        <Text> </Text>
                        <Text color="green">Your Bitcoin has been successfully claimed!</Text>
                        <Text dimColor>The transaction is being confirmed on the Bitcoin network.</Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Box borderStyle="double" borderColor="yellow" padding={1} marginBottom={1}>
                <Box flexDirection="column">
                    <Box justifyContent="center" marginBottom={1}>
                        <Text bold color="yellow">⚡ BITCOIN READY TO CLAIM! ⚡</Text>
                    </Box>
                    
                    <Box flexDirection="column">
                        <Text>The Ethereum side has revealed the secret!</Text>
                        <Text>You can now claim your Bitcoin from the HTLC.</Text>
                        <Text> </Text>
                        <Text>HTLC Address:</Text>
                        <Text color="cyan">{htlcAddress}</Text>
                        {secret && (
                            <>
                                <Text> </Text>
                                <Text>Secret (revealed):</Text>
                                <Text color="green">{secret.substring(0, 20)}...</Text>
                            </>
                        )}
                    </Box>
                </Box>
            </Box>

            {error && (
                <Box marginBottom={1}>
                    <Text color="red">❌ {error}</Text>
                </Box>
            )}

            {!walletConnected && !claiming && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text bold>Select your Bitcoin wallet:</Text>
                    </Box>
                    <SelectInput
                        items={walletOptions}
                        onSelect={(item: { value: string }) => {
                            setWalletConnected(true);
                            if (item.value === 'demo') {
                                // Auto-claim for demo mode
                                setTimeout(handleClaim, 1000);
                            }
                        }}
                    />
                </Box>
            )}

            {walletConnected && !claiming && (
                <Box flexDirection="column">
                    <Box borderStyle="round" borderColor="green" padding={1} marginBottom={1}>
                        <Text color="green">✅ Wallet Connected</Text>
                    </Box>
                    
                    <SelectInput
                        items={[
                            { label: '⚡ Claim Bitcoin Now', value: 'claim' },
                            { label: '← Back', value: 'back' }
                        ]}
                        onSelect={(item: { value: string }) => {
                            if (item.value === 'claim') {
                                handleClaim();
                            } else {
                                onBack();
                            }
                        }}
                    />
                </Box>
            )}

            {claiming && !txHash && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color="yellow">
                            <Spinner type="arc" /> Claiming Bitcoin from HTLC...
                        </Text>
                    </Box>
                    <Box flexDirection="column" marginLeft={2}>
                        <Text color="green">✓ Wallet connected</Text>
                        <Text color="green">✓ Secret verified</Text>
                        <Text color="yellow">
                            <Spinner type="dots12" /> Broadcasting claim transaction...
                        </Text>
                    </Box>
                </Box>
            )}
        </Box>
    );
};