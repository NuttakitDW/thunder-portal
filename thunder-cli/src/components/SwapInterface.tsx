import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, SelectInput, Spinner } from '../utils/ink-imports.js';
import { createSwap } from '../services/api.js';

interface ProgressStepProps {
    complete: boolean;
    active: boolean;
    text: string;
}

const ProgressStep: React.FC<ProgressStepProps> = ({ complete, active, text }) => {
    return (
        <Text>
            {complete ? <Text color="green">✓</Text> : active ? <Text color="yellow">⚡</Text> : <Text color="gray">○</Text>} {text}
            {active && <Text color="yellow"> <Spinner type="dots12" /></Text>}
        </Text>
    );
};

interface SwapInterfaceProps {
    demoMode: boolean;
    onSwapCreated: (swapId: string) => void;
    onBack: () => void;
}

type SwapDirection = 'btc-to-eth' | 'eth-to-btc';
type Step = 'direction' | 'amount' | 'confirm' | 'processing';

export const SwapInterface: React.FC<SwapInterfaceProps> = ({ demoMode, onSwapCreated, onBack }) => {
    const [step, setStep] = useState<Step>('direction');
    const [direction, setDirection] = useState<SwapDirection>('btc-to-eth');
    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useInput((input) => {
        if (input === 'q' && step !== 'processing') {
            onBack();
        }
    });

    const handleDirectionSelect = (item: { value: SwapDirection }) => {
        setDirection(item.value);
        setStep('amount');
    };

    const handleAmountSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        setError(null);
        setStep('confirm');
    };

    const handleConfirm = async (confirmed: boolean) => {
        if (!confirmed) {
            onBack();
            return;
        }

        setStep('processing');
        setProcessing(true);
        setError(null);

        try {
            const swapData = await createSwap({
                direction,
                amount: parseFloat(amount),
                demoMode
            });
            
            // Ensure smooth transition
            setTimeout(() => {
                setProcessing(false);
                onSwapCreated(swapData.orderId);
            }, 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Swap creation failed');
            setStep('confirm');
            setProcessing(false);
        }
    };

    const calculateReceiveAmount = () => {
        const rate = direction === 'btc-to-eth' ? 20 : 0.05; // Example rates
        return (parseFloat(amount) * rate).toFixed(4);
    };

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text bold color="cyan">🔄 Create Atomic Swap</Text>
            </Box>

            {error && (
                <Box marginBottom={1}>
                    <Text color="red">❌ {error}</Text>
                </Box>
            )}

            {step === 'direction' && (
                <Box flexDirection="column">
                    <Text>Select swap direction:</Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={[
                                { label: '₿ BTC → ⟠ ETH', value: 'btc-to-eth' },
                                { label: '⟠ ETH → ₿ BTC', value: 'eth-to-btc' }
                            ]}
                            onSelect={handleDirectionSelect}
                        />
                    </Box>
                </Box>
            )}

            {step === 'amount' && (
                <Box flexDirection="column">
                    <Text>
                        Enter amount to swap ({direction === 'btc-to-eth' ? 'BTC' : 'ETH'}):
                    </Text>
                    <Box marginTop={1}>
                        <TextInput
                            value={amount}
                            onChange={setAmount}
                            onSubmit={handleAmountSubmit}
                            placeholder="0.1"
                        />
                    </Box>
                    <Box marginTop={1}>
                        <Text dimColor>Press Enter to continue</Text>
                    </Box>
                </Box>
            )}

            {step === 'confirm' && (
                <Box flexDirection="column">
                    <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
                        <Box flexDirection="column">
                            <Text bold>Swap Details:</Text>
                            <Text> </Text>
                            <Text>Direction: {direction === 'btc-to-eth' ? '₿ BTC → ⟠ ETH' : '⟠ ETH → ₿ BTC'}</Text>
                            <Text>You send: {amount} {direction === 'btc-to-eth' ? 'BTC' : 'ETH'}</Text>
                            <Text>You receive: ~{calculateReceiveAmount()} {direction === 'btc-to-eth' ? 'ETH' : 'BTC'}</Text>
                            <Text>Rate: {direction === 'btc-to-eth' ? '20 ETH/BTC' : '0.05 BTC/ETH'}</Text>
                            <Text> </Text>
                            <Text bold color="cyan">⚡ Order Chunking:</Text>
                            <Text>Your order will be split into 100 chunks</Text>
                            <Text>Each chunk: {(parseFloat(amount) / 100).toFixed(6)} {direction === 'btc-to-eth' ? 'BTC' : 'ETH'}</Text>
                            <Text dimColor>This enables partial fulfillment by multiple resolvers</Text>
                        </Box>
                    </Box>
                    
                    <SelectInput
                        items={[
                            { label: '✅ Confirm Swap', value: true },
                            { label: '❌ Cancel', value: false }
                        ]}
                        onSelect={(item: { value: boolean }) => handleConfirm(item.value)}
                    />
                </Box>
            )}

            {step === 'processing' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color="yellow" bold>
                            ⚡ <Spinner type="arc" /> Creating atomic swap...
                        </Text>
                    </Box>
                    <Box borderStyle="round" borderColor="yellow" padding={1}>
                        <Box flexDirection="column">
                            <ProgressStep 
                                complete 
                                active={false}
                                text="Generating 101 cryptographic secrets" 
                            />
                            <ProgressStep 
                                complete 
                                active={false}
                                text="Building Merkle tree for chunks" 
                            />
                            <ProgressStep 
                                complete={false} 
                                active
                                text="Creating Bitcoin HTLC" 
                            />
                            <ProgressStep 
                                complete={false} 
                                active={false}
                                text="Deploying Ethereum escrow" 
                            />
                            <ProgressStep 
                                complete={false} 
                                active={false}
                                text="Registering with 1inch Fusion+" 
                            />
                            <ProgressStep 
                                complete={false} 
                                active={false}
                                text="Opening for resolver competition" 
                            />
                        </Box>
                    </Box>
                    <Box marginTop={1}>
                        <Text dimColor italic>This process typically takes 10-30 seconds...</Text>
                    </Box>
                </Box>
            )}
        </Box>
    );
};