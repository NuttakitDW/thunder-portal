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
            label: '💰 Check Balances',
            value: 'balance' as Screen
        },
        {
            label: '🔄 Create Atomic Swap',
            value: 'swap' as Screen
        },
        {
            label: '📊 Active Swaps Status',
            value: 'status' as Screen
        },
        {
            label: '📜 Swap History',
            value: 'history' as Screen
        }
    ];

    const handleSelect = (item: { value: Screen }) => {
        onSelect(item.value);
    };

    return (
        <Box flexDirection="column">
            <Box marginY={1}>
                <Text bold color="cyan">Main Menu</Text>
            </Box>
            <SelectInput items={items} onSelect={handleSelect} />
            <Box marginTop={2}>
                <Text dimColor>Use arrow keys to navigate, Enter to select</Text>
            </Box>
        </Box>
    );
};