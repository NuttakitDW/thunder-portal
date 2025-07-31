#!/usr/bin/env node

const axios = require('axios');

async function testEnvironment() {
    console.log('🧪 Testing Thunder Portal Local Environment\n');
    
    const tests = {
        ethereum: false,
        bitcoin: false
    };
    
    // Test Ethereum connection
    try {
        console.log('Testing Ethereum connection...');
        const ethResponse = await axios.post('http://localhost:8545', {
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
        });
        
        const blockNumber = parseInt(ethResponse.data.result, 16);
        console.log(`✅ Ethereum connected! Current block: ${blockNumber}`);
        
        // Check test account balance
        const balanceResponse = await axios.post('http://localhost:8545', {
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'latest'],
            id: 2
        });
        
        const balance = parseInt(balanceResponse.data.result, 16) / 1e18;
        console.log(`✅ Test account balance: ${balance} ETH`);
        
        tests.ethereum = true;
    } catch (error) {
        console.log('❌ Ethereum connection failed:', error.message);
    }
    
    // Test Bitcoin connection
    try {
        console.log('\nTesting Bitcoin connection...');
        const btcResponse = await axios.post('http://localhost:18443', {
            jsonrpc: '1.0',
            method: 'getblockcount',
            params: [],
            id: 1
        }, {
            auth: {
                username: 'thunderportal',
                password: 'thunderportal123'
            }
        });
        
        console.log(`✅ Bitcoin connected! Block height: ${btcResponse.data.result}`);
        
        // Check wallet info
        const walletResponse = await axios.post('http://localhost:18443', {
            jsonrpc: '1.0',
            method: 'getwalletinfo',
            params: [],
            id: 2
        }, {
            auth: {
                username: 'thunderportal',
                password: 'thunderportal123'
            }
        });
        
        console.log(`✅ Bitcoin wallet ready! Balance: ${walletResponse.data.result.balance} BTC`);
        
        tests.bitcoin = true;
    } catch (error) {
        console.log('❌ Bitcoin connection failed:', error.message);
        console.log('   Make sure Bitcoin regtest is running');
    }
    
    // Summary
    console.log('\n📊 Environment Status:');
    console.log(`- Ethereum: ${tests.ethereum ? '✅ Ready' : '❌ Not ready'}`);
    console.log(`- Bitcoin:  ${tests.bitcoin ? '✅ Ready' : '❌ Not ready'}`);
    
    if (tests.ethereum && tests.bitcoin) {
        console.log('\n🎉 Thunder Portal local environment is fully operational!');
        console.log('\nYou can now:');
        console.log('1. Deploy contracts to local Ethereum fork');
        console.log('2. Create HTLCs on Bitcoin regtest');
        console.log('3. Test atomic swaps between the chains');
    } else {
        console.log('\n⚠️  Please ensure all services are running:');
        console.log('- For Ethereum: ./scripts/start-local-hardhat.sh');
        console.log('- For Bitcoin: docker-compose -f docker-compose.local.yml up -d');
    }
}

// Run test
testEnvironment().catch(console.error);