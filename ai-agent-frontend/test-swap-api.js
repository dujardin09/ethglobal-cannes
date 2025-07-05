#!/usr/bin/env node

/**
 * Test script for KittyPunch Swap API
 * Run with: node test-swap-api.js
 */

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing KittyPunch Swap API...\n');

  try {
    // Test 1: Get available tokens
    console.log('1️⃣ Testing GET /api/tokens');
    const tokensResponse = await fetch(`${API_BASE}/tokens`);
    const tokensData = await tokensResponse.json();
    
    if (tokensResponse.ok) {
      console.log('✅ Success - Available tokens:', tokensData.tokens.length);
      tokensData.tokens.forEach(token => {
        console.log(`   - ${token.symbol}: ${token.name}`);
      });
    } else {
      console.error('❌ Failed:', tokensData.error);
    }

    console.log('\n2️⃣ Testing GET /api/tokens/balances');
    const balancesResponse = await fetch(`${API_BASE}/tokens/balances?userAddress=0x1234567890123456`);
    const balancesData = await balancesResponse.json();
    
    if (balancesResponse.ok) {
      console.log('✅ Success - Token balances:');
      Object.entries(balancesData.balances).forEach(([address, balance]) => {
        const token = tokensData.tokens?.find(t => t.address === address);
        const symbol = token ? token.symbol : address.slice(0, 8) + '...';
        console.log(`   - ${symbol}: ${balance}`);
      });
    } else {
      console.error('❌ Failed:', balancesData.error);
    }

    // Test 3: Get swap quote
    if (tokensData.tokens && tokensData.tokens.length >= 2) {
      console.log('\n3️⃣ Testing POST /api/swap/quote');
      const quoteResponse = await fetch(`${API_BASE}/swap/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenInAddress: tokensData.tokens[0].address,
          tokenOutAddress: tokensData.tokens[1].address,
          amountIn: '10.0'
        })
      });
      
      const quoteData = await quoteResponse.json();
      
      if (quoteResponse.ok) {
        const quote = quoteData.quote;
        console.log('✅ Success - Swap quote:');
        console.log(`   - Input: ${quote.amountIn} ${quote.tokenIn.symbol}`);
        console.log(`   - Output: ${quote.amountOut} ${quote.tokenOut.symbol}`);
        console.log(`   - Price Impact: ${quote.priceImpact}%`);
        console.log(`   - Fee: ${quote.fee} ${quote.tokenIn.symbol}`);
        console.log(`   - Quote ID: ${quote.id}`);
        
        // Test 4: Execute swap (this will fail in mock but should return proper error)
        console.log('\n4️⃣ Testing POST /api/swap/execute');
        const executeResponse = await fetch(`${API_BASE}/swap/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: quote.id,
            userAddress: '0x1234567890123456',
            slippageTolerance: 0.5
          })
        });
        
        const executeData = await executeResponse.json();
        
        if (executeResponse.ok) {
          console.log('✅ Success - Swap execution:');
          console.log(`   - Transaction ID: ${executeData.transaction.id}`);
          console.log(`   - Status: ${executeData.transaction.status}`);
          console.log(`   - Hash: ${executeData.transaction.hash || 'N/A'}`);
        } else {
          console.log('⚠️ Expected failure (mock):', executeData.error);
        }
      } else {
        console.error('❌ Failed:', quoteData.error);
      }
    }

    // Test 5: Service test endpoint
    console.log('\n5️⃣ Testing GET /api/test/swap');
    const testResponse = await fetch(`${API_BASE}/test/swap`);
    const testData = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ Success - Service test:', testData.message);
      console.log(`   - Available tokens: ${testData.tests.availableTokens.length}`);
      console.log(`   - Mock balances: ${Object.keys(testData.tests.mockBalances).length} tokens`);
      console.log(`   - Test quote: ${testData.tests.testQuote ? 'Generated' : 'Failed'}`);
      console.log(`   - Price history: ${testData.tests.priceHistory ? testData.tests.priceHistory.length + ' points' : 'Failed'}`);
    } else {
      console.error('❌ Failed:', testData.error);
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ Test script error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
