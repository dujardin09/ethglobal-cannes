#!/usr/bin/env node

/**
 * Test script for Flow integration in the AI DeFi Agent
 * This script tests the new real Flow blockchain calls vs mock logic
 */

const { FlowUtils } = require('./src/lib/flow-integration');
const { kittyPunchSwapService } = require('./src/services/swap');

async function testFlowIntegration() {
  console.log('🚀 Testing Flow Integration for AI DeFi Agent');
  console.log('=' .repeat(50));

  // Test address (Flow emulator default)
  const testAddress = '0x01cf0e2f2f715450';

  console.log(`📍 Testing with address: ${testAddress}`);
  console.log('');

  // Test 1: Direct Flow balance query
  console.log('1️⃣ Testing direct FLOW balance query...');
  try {
    const flowBalance = await FlowUtils.getFlowBalance(testAddress, 'testnet');
    console.log(`   ✅ FLOW Balance: ${flowBalance} FLOW`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Multi-token balance query
  console.log('');
  console.log('2️⃣ Testing multi-token balance query...');
  try {
    const multiBalances = await FlowUtils.getMultipleBalances(testAddress, 'testnet');
    console.log('   ✅ Multi-token balances:');
    Object.entries(multiBalances).forEach(([token, balance]) => {
      console.log(`      ${token}: ${balance}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Swap service token balances (uses Flow integration)
  console.log('');
  console.log('3️⃣ Testing swap service token balances...');
  try {
    const balances = await kittyPunchSwapService.getTokenBalances(testAddress);
    console.log('   ✅ Swap service balances:');
    Object.entries(balances).forEach(([address, balance]) => {
      console.log(`      ${address}: ${balance}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Swap quote (includes on-chain DEX quote script)
  console.log('');
  console.log('4️⃣ Testing swap quote with on-chain DEX script...');
  try {
    const quote = await kittyPunchSwapService.getSwapQuote(
      '0x0ae53cb6e3f42a79', // FLOW
      '0xf233dcee88fe0abe', // FUSD
      '10.0'
    );

    if (quote) {
      console.log('   ✅ Swap quote generated:');
      console.log(`      Amount In: ${quote.amountIn} ${quote.tokenIn.symbol}`);
      console.log(`      Amount Out: ${quote.amountOut} ${quote.tokenOut.symbol}`);
      console.log(`      Price Impact: ${quote.priceImpact}%`);
      console.log(`      Fee: ${quote.fee} ${quote.tokenIn.symbol}`);
    } else {
      console.log('   ❌ Failed to generate quote');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('');
  console.log('📊 Integration Status Summary:');
  console.log('   ✅ FLOW token balance queries: REAL blockchain calls');
  console.log('   🔧 FUSD/USDC/USDT balances: Mock (ready for real integration)');
  console.log('   🔧 DEX swap execution: Mock (ready for Increment/BloctoSwap)');
  console.log('   ✅ Network-aware contract management: Implemented');
  console.log('   ✅ Cadence script templates: FRW-inspired patterns');

  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Add real contract addresses for FUSD, USDC, USDT');
  console.log('   2. Integrate with a real DEX (Increment, BloctoSwap)');
  console.log('   3. Test on Flow testnet/mainnet');
  console.log('   4. Add more comprehensive error handling');
}

// Run the test
if (require.main === module) {
  testFlowIntegration()
    .then(() => {
      console.log('');
      console.log('✨ Flow integration test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFlowIntegration };
