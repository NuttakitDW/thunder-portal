#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${BLUE}⚡ Thunder Portal CLI Demo${NC}"
echo -e "${YELLOW}Beautiful terminal UI for atomic swaps${NC}"
echo ""

# Check if demo mode flag is passed
if [ "$1" == "--install" ]; then
    echo -e "${GREEN}Installing Thunder Portal CLI globally...${NC}"
    npm install -g .
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo ""
    echo -e "You can now run: ${YELLOW}thunder${NC}"
    echo ""
fi

echo -e "${GREEN}Starting Thunder Portal CLI in demo mode...${NC}"
echo ""
sleep 1

# Run the CLI in demo mode with TTY
# Force TTY mode for interactive terminal
script -q /dev/null npm run demo