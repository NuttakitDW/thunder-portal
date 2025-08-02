import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, SelectInput, Spinner } from '../utils/ink-imports.js';
import { createSwap, getSwapStatus } from '../services/api.js';
import DutchAuctionVisualizer from './DutchAuctionVisualizer.js';
import MultiResolverView from './MultiResolverView.js';
import MerkleChunkingVisualizer from './MerkleChunkingVisualizer.js';
import TransactionHashDisplay from './TransactionHashDisplay.js';

interface SwapInterfaceProps {
    demoMode: boolean;
    onSwapCreated: (swapId: string) => void;
    onBack: () => void;
}

type SwapDirection = 'btc-to-eth' | 'eth-to-btc';
type Step = 'direction' | 'amount' | 'confirm' | 'processing' | 'monitoring';

interface Transaction {
    type: 'ethereum' | 'bitcoin';
    hash: string;
    description: string;
    status: 'pending' | 'confirmed';
    confirmations?: number;
}

export const EnhancedSwapInterface: React.FC<SwapInterfaceProps> = ({ demoMode, onSwapCreated, onBack }) => {
    const [step, setStep] = useState<Step>('direction');
    const [direction, setDirection] = useState<SwapDirection>('eth-to-btc');
    const [amount, setAmount] = useState('');
    const [swapId, setSwapId] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Visualization states
    const [showDutchAuction, setShowDutchAuction] = useState(false);
    const [showResolvers, setShowResolvers] = useState(false);
    const [showChunking, setShowChunking] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [swapProgress, setSwapProgress] = useState(0);

    useInput((input) => {
        if (input === 'q' && step !== 'processing') {
            onBack();
        }
    });

    useEffect(() => {
        if (step === 'monitoring' && swapId) {
            let timeoutId: NodeJS.Timeout;
            const interval = setInterval(async () => {
                try {
                    const status = await getSwapStatus(swapId);
                    setSwapProgress(status.progress);
                    
                    // Update transaction list
                    if (status.ethereumTxHash && !transactions.find(tx => tx.hash === status.ethereumTxHash)) {
                        setTransactions(prev => [...prev, {
                            type: 'ethereum',
                            hash: status.ethereumTxHash!,
                            description: direction === 'eth-to-btc' ? 'Escrow Deployment' : 'ETH Claim',
                            status: 'confirmed',
                            confirmations: 12
                        }]);
                    }
                    
                    if (status.bitcoinTxHash && !transactions.find(tx => tx.hash === status.bitcoinTxHash)) {
                        setTransactions(prev => [...prev, {
                            type: 'bitcoin',
                            hash: status.bitcoinTxHash!,
                            description: direction === 'eth-to-btc' ? 'HTLC Creation' : 'BTC Funding',
                            status: status.progress > 50 ? 'confirmed' : 'pending',
                            confirmations: status.progress > 50 ? 3 : 0
                        }]);
                    }

                    if (status.progress >= 100) {
                        clearInterval(interval);
                        timeoutId = setTimeout(() => onSwapCreated(swapId), 2000);
                    }
                } catch (err) {
                    console.error('Status check error:', err);
                }
            }, 2000);

            return () => {
                clearInterval(interval);
                if (timeoutId) clearTimeout(timeoutId);
            };
        }
    }, [step, swapId, direction, transactions, onSwapCreated]);

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
        setShowChunking(true);

        try {
            // Simulate chunking process
            setTimeout(() => {
                setShowChunking(false);
                setShowDutchAuction(true);
                setShowResolvers(true);
            }, 5000);

            const swapData = await createSwap({
                direction,
                amount: parseFloat(amount),
                demoMode
            });
            
            setSwapId(swapData.orderId);
            
            setTimeout(() => {
                setStep('monitoring');
                setProcessing(false);
            }, 7000);
        } catch (err) {
            setError(err instanceof Error ? (err.message || 'Swap creation failed') : 'Swap creation failed');
            setStep('confirm');
            setProcessing(false);
        }
    };

    const calculateReceiveAmount = () => {
        const rate = direction === 'btc-to-eth' ? 20 : 0.05;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount === 0) {
            return '0.0000';
        }
        return (numAmount * rate).toFixed(4);
    };

    const renderSwapFlowExplanation = () => {
        if (direction === 'eth-to-btc') {
            return (
                <Box flexDirection="column" marginTop={1}>
                    <Text bold color="yellow">⚡ ETH → BTC Flow:</Text>
                    <Box marginLeft={2} flexDirection="column">
                        <Text>1. Your ETH is locked in escrow contract</Text>
                        <Text>2. Resolvers create Bitcoin HTLCs</Text>
                        <Text>3. Dutch auction finds best rates</Text>
                        <Text color="cyan" bold>4. YOU claim BTC with one-click interface ✨</Text>
                        <Text>5. Resolvers claim ETH using revealed secret</Text>
                    </Box>
                </Box>
            );
        } else {
            return (
                <Box flexDirection="column" marginTop={1}>
                    <Text bold color="yellow">⚡ BTC → ETH Flow:</Text>
                    <Box marginLeft={2} flexDirection="column">
                        <Text>1. You fund Bitcoin HTLC</Text>
                        <Text>2. Resolvers deploy ETH escrows</Text>
                        <Text>3. Dutch auction finds best rates</Text>
                        <Text color="cyan" bold>4. Resolver claims ETH for you automatically ✨</Text>
                        <Text>5. Resolver claims BTC using revealed secret</Text>
                    </Box>
                </Box>
            );
        }
    };

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text bold color="cyan">🔄 Thunder Portal Atomic Swap</Text>
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
                                { label: '⟠ ETH → ₿ BTC (You claim BTC)', value: 'eth-to-btc' },
                                { label: '₿ BTC → ⟠ ETH (Auto-claimed)', value: 'btc-to-eth' }
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
                            placeholder={direction === 'btc-to-eth' ? '0.1' : '1.0'}
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
                            <Box marginBottom={1} />
                            <Text>Direction: {direction === 'btc-to-eth' ? '₿ BTC → ⟠ ETH' : '⟠ ETH → ₿ BTC'}</Text>
                            <Text>You send: {amount || '0'} {direction === 'btc-to-eth' ? 'BTC' : 'ETH'}</Text>
                            <Text>You receive: ~{calculateReceiveAmount()} {direction === 'btc-to-eth' ? 'ETH' : 'BTC'}</Text>
                            <Text>Rate: {direction === 'btc-to-eth' ? '20 ETH/BTC' : '0.05 BTC/ETH'}</Text>
                            
                            {renderSwapFlowExplanation()}
                            
                            <Box marginTop={1}>
                                <Text bold color="magenta">🌳 Technical Innovation:</Text>
                                <Box marginLeft={2} flexDirection="column">
                                    <Text>• 100 chunk Merkle tree splitting</Text>
                                    <Text>• Dutch auction price discovery</Text>
                                    <Text>• Multiple resolver competition</Text>
                                    <Text>• 1inch Fusion+ integration</Text>
                                    <Text>• Gas-free swapping</Text>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                    
                    <SelectInput
                        items={[
                            { label: '✅ Confirm Swap', value: 'confirm' },
                            { label: '❌ Cancel', value: 'cancel' }
                        ]}
                        onSelect={(item: { value: string }) => {
                            // Prevent any rendering issues during state transition
                            setTimeout(() => handleConfirm(item.value === 'confirm'), 0);
                        }}
                    />
                </Box>
            )}

            {(step === 'processing' || step === 'monitoring') && (
                <Box flexDirection="column">
                    {showChunking && (
                        <Box marginBottom={1}>
                            <MerkleChunkingVisualizer
                                orderAmount={parseFloat(amount)}
                                asset={direction === 'btc-to-eth' ? 'BTC' : 'ETH'}
                                totalChunks={100}
                                isProcessing={true}
                            />
                        </Box>
                    )}

                    {showDutchAuction && (
                        <Box marginBottom={1}>
                            <DutchAuctionVisualizer
                                orderAmount={parseFloat(amount)}
                                startPrice={direction === 'btc-to-eth' ? 21 : 0.052}
                                endPrice={direction === 'btc-to-eth' ? 19 : 0.048}
                                duration={300}
                                status={step === 'monitoring' ? 'active' : 'pending'}
                            />
                        </Box>
                    )}

                    {showResolvers && (
                        <Box marginBottom={1}>
                            <MultiResolverView
                                totalChunks={100}
                                isActive={step === 'monitoring'}
                            />
                        </Box>
                    )}

                    {transactions.length > 0 && (
                        <Box marginBottom={1}>
                            <TransactionHashDisplay transactions={transactions} />
                        </Box>
                    )}

                    {step === 'monitoring' && (
                        <Box borderStyle="round" borderColor="green" padding={1}>
                            <Box flexDirection="column">
                                <Text bold color="green">Swap Progress: {swapProgress}%</Text>
                                <Box marginTop={1}>
                                    <Text>
                                        [<Text color="green">{'█'.repeat(Math.floor(swapProgress / 5))}</Text>
                                        <Text color="gray">{'░'.repeat(20 - Math.floor(swapProgress / 5))}</Text>]
                                    </Text>
                                </Box>
                                {swapProgress >= 100 && (
                                    <Box marginTop={1}>
                                        <Text bold color="green">✅ Swap ready for claiming!</Text>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};