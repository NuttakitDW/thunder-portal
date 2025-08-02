import React from 'react';
import { Box, Text } from 'ink';
import { SelectInput } from '../utils/ink-imports.js';
import { Screen } from '../App.js';

interface MainMenuProps {
    onSelect: (screen: Screen) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelect }) => {
    const items = [
        {
            label: '⚡ 💰 Check Balances',
            value: 'balance' as Screen
        },
        {
            label: '⚡ 🔄 Create Atomic Swap',
            value: 'swap' as Screen
        },
        {
            label: '⚡ 📊 Active Swaps Status',
            value: 'status' as Screen
        },
        {
            label: '⚡ 📜 Swap History',
            value: 'history' as Screen
        }
    ];

    const handleSelect = (item: { value: Screen }) => {
        onSelect(item.value);
    };

    return (
        <Box flexDirection="column">
            <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
                <Box flexDirection="column">
                    <Box justifyContent="center" marginBottom={1}>
                        <Text bold color="yellow">⚡ THUNDER PORTAL MENU ⚡</Text>
                    </Box>
                    <SelectInput items={items} onSelect={handleSelect} />
                </Box>
            </Box>
            <Box justifyContent="center">
                <Text dimColor>[↑↓] Navigate  [⏎] Select  [q] Quit</Text>
            </Box>
        </Box>
    );
};