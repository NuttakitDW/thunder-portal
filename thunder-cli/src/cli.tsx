#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './App.js';

const cli = meow(`
    Usage
      $ thunder

    Options
      --demo    Run in demo mode with fake balances

    Examples
      $ thunder
      $ thunder --demo
`, {
    importMeta: import.meta,
    flags: {
        demo: {
            type: 'boolean',
            default: false
        }
    }
});

// Check if we're in a TTY
if (!process.stdin.isTTY) {
    console.error('Error: Interactive mode requires a TTY terminal.');
    console.error('Try running this command in a real terminal, not through a pipe or script.');
    process.exit(1);
}

render(<App demoMode={cli.flags.demo} />);