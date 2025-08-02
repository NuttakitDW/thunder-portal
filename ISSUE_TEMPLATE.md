## Problem Description

The `make thunder` command fails with the following error:
```
Error: Cannot find module 'hardhat'
Require stack:
- /Users/nuttakitkundum/projects/thunder-portal/scripts/deploy-contracts-simple.js
```

## Root Cause

The root directory has a `package.json` file with dependencies including `hardhat`, but the Makefile's `setup` target only installs dependencies in subdirectories (evm-resolver, relayer, resolver, thunder-cli) and doesn't run `npm install` in the root directory.

## Steps to Reproduce

1. Clone the repository on a fresh system
2. Run `make thunder`
3. The command will fail during the contract deployment step

## Expected Behavior

The `make thunder` command should successfully install all dependencies and run the demo.

## Proposed Fix

Update the Makefile's `setup` target to include:
```makefile
@echo "Installing root dependencies..."
@npm install
```

This will ensure that hardhat and other root-level dependencies are installed before attempting to deploy contracts.

## Environment

- macOS Darwin 24.4.0
- Node.js v22.14.0
- npm (version included with Node.js)

## Additional Notes

This issue likely affects new users trying to run the project for the first time, as it prevents the initial setup from completing successfully.