import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { BigText, Gradient } from './utils/ink-imports.js';
import { MainMenu } from './components/MainMenu.js';
import { SwapInterface } from './components/SwapInterface.js';
import { BalanceView } from './components/BalanceView.js';
import { StatusDashboard } from './components/StatusDashboard.js';
import { SwapHistory } from './components/SwapHistory.js';

interface AppProps {
    demoMode: boolean;
}

export type Screen = 'menu' | 'balance' | 'swap' | 'status' | 'history';

const App: React.FC<AppProps> = ({ demoMode }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
    const [activeSwapId, setActiveSwapId] = useState<string | null>(null);

    const handleSwapCreated = (swapId: string) => {
        setActiveSwapId(swapId);
        setCurrentScreen('status');
    };

    const handleBack = () => {
        setCurrentScreen('menu');
    };

    return (
        <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
                <Gradient name="rainbow">
                    <BigText text="THUNDER" font="chrome" />
                </Gradient>
            </Box>
            
            <Box marginBottom={1}>
                <Text bold color="yellow">
                    ⚡ Trustless Bitcoin ⟷ Ethereum Atomic Swaps
                </Text>
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
                />
            )}
            
            {currentScreen === 'history' && (
                <SwapHistory onBack={handleBack} />
            )}
        </Box>
    );
};

export default App;