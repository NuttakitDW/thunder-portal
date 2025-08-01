import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { BigText, Gradient } from './utils/ink-imports.js';
import { MainMenu } from './components/MainMenu.js';
import { SwapInterface } from './components/SwapInterface.js';
import { BalanceView } from './components/BalanceView.js';
import { StatusDashboard } from './components/StatusDashboard.js';
import { SwapHistory } from './components/SwapHistory.js';
import { BitcoinClaimInterface } from './components/BitcoinClaimInterface.js';

interface AppProps {
    demoMode: boolean;
}

export type Screen = 'menu' | 'balance' | 'swap' | 'status' | 'history' | 'claim';

const App: React.FC<AppProps> = ({ demoMode }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
    const [activeSwapId, setActiveSwapId] = useState<string | null>(null);
    const [claimData, setClaimData] = useState<{ swapId: string; htlcAddress: string; secret?: string; escrowAddress?: string } | null>(null);

    const handleSwapCreated = (swapId: string) => {
        setActiveSwapId(swapId);
        setCurrentScreen('status');
    };

    const handleClaimReady = (swapId: string, htlcAddress: string, secret?: string, escrowAddress?: string) => {
        setClaimData({ swapId, htlcAddress, secret, escrowAddress });
        setCurrentScreen('claim');
    };

    const handleClaimComplete = () => {
        setClaimData(null);
        setCurrentScreen('menu');
    };

    const handleBack = () => {
        setCurrentScreen('menu');
    };

    return (
        <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1} flexDirection="column" alignItems="center">
                <Box>
                    <Text bold color="yellow">⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡</Text>
                </Box>
                <Box>
                    <Text bold color="yellow">⚡                                                                                             ⚡</Text>
                </Box>
                <Box>
                    <Gradient name="atlas">
                        <BigText text="THUNDER" font="block" />
                    </Gradient>
                </Box>
                <Box>
                    <Text bold color="yellow">⚡                                                                                             ⚡</Text>
                </Box>
                <Box>
                    <Text bold color="yellow">⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡</Text>
                </Box>
            </Box>
            
            <Box marginBottom={1} justifyContent="center">
                <Box borderStyle="round" borderColor="yellow" paddingX={2}>
                    <Text bold color="cyan">
                        ⚡ Trustless Bitcoin ⟷ Ethereum Atomic Swaps ⚡
                    </Text>
                </Box>
            </Box>

            {demoMode && (
                <Box marginBottom={1}>
                    <Text color="magenta" dimColor>
                        🎮 Demo Mode - Using test balances
                    </Text>
                </Box>
            )}

            {currentScreen === 'menu' && (
                <MainMenu onSelect={setCurrentScreen} />
            )}
            
            {currentScreen === 'balance' && (
                <BalanceView demoMode={demoMode} onBack={handleBack} />
            )}
            
            {currentScreen === 'swap' && (
                <SwapInterface 
                    demoMode={demoMode} 
                    onSwapCreated={handleSwapCreated}
                    onBack={handleBack}
                />
            )}
            
            {currentScreen === 'status' && (
                <StatusDashboard 
                    swapId={activeSwapId}
                    onBack={handleBack}
                    onClaimReady={handleClaimReady}
                />
            )}
            
            {currentScreen === 'history' && (
                <SwapHistory onBack={handleBack} />
            )}
            
            {currentScreen === 'claim' && claimData && (
                <BitcoinClaimInterface
                    swapId={claimData.swapId}
                    htlcAddress={claimData.htlcAddress}
                    secret={claimData.secret}
                    escrowAddress={claimData.escrowAddress}
                    onClaimed={handleClaimComplete}
                    onBack={handleBack}
                />
            )}
        </Box>
    );
};

export default App;