#!/usr/bin/env node

/**
 * Simple test script to verify the API endpoints are working
 */

async function testAPI() {
  console.log('🧪 Testing AI DeFi Agent API...');
  
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // Test 1: Available tokens
    console.log('\n1️⃣ Testing /api/tokens...');
    const tokensResponse = await fetch(`${baseUrl}/tokens`);
    const tokensData = await tokensResponse.json();
    console.log(`✅ Found ${tokensData.tokens.length} tokens`);
    
    // Test 2: Token balances
    console.log('\n2️⃣ Testing /api/tokens/balances...');
    const balancesResponse = await fetch(`${baseUrl}/tokens/balances?userAddress=0x01cf0e2f2f715450`);
    const balancesData = await balancesResponse.json();
    
    if (balancesData.error) {
      console.log(`❌ Error: ${balancesData.error}`);
    } else {
      console.log(`✅ Balances retrieved`);
      console.log(`   Data source: ${balancesData.metadata?.dataSource || 'unknown'}`);
      console.log(`   Flow network available: ${balancesData.metadata?.flowNetworkAvailable || 'unknown'}`);
      console.log(`   FLOW balance: ${balancesData.balances['0x0ae53cb6e3f42a79'] || 'not found'}`);
    }
    
    // Test 3: Flow integration test endpoint
    console.log('\n3️⃣ Testing /api/flow/test...');
    try {
      const flowTestResponse = await fetch(`${baseUrl}/flow/test?userAddress=0x01cf0e2f2f715450`);
      const flowTestData = await flowTestResponse.json();
      console.log(`✅ Flow test endpoint responded`);
      console.log(`   Network: ${flowTestData.network || 'unknown'}`);
    } catch (error) {
      console.log(`ℹ️  Flow test endpoint not available (this is OK)`);
    }
    
    console.log('\n🎉 API test completed!');
    
  } catch (error) {
    console.error('\n💥 API test failed:', error.message);
  }
}

// Run the test if executed directly
if (require.main === module) {
  testAPI().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { testAPI };
