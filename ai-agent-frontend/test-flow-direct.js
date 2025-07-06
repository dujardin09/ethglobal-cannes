#!/usr/bin/env node

/**
 * Direct Flow connectivity test
 */

const fcl = require('@onflow/fcl');

async function testFlowDirect() {
  console.log('🔗 Testing direct Flow connectivity...');

  // Configure FCL
  fcl.config({
    'accessNode.api': 'https://rest-testnet.onflow.org',
  });

  console.log('FCL configured with:', fcl.config().get('accessNode.api'));

  try {
    // Test 1: Simple HTTP check
    console.log('\n1️⃣ Testing HTTP connectivity...');
    const response = await fetch('https://rest-testnet.onflow.org', { method: 'HEAD' });
    console.log(`   Status: ${response.status} ${response.statusText}`);

    // Test 2: Simple Flow query
    console.log('\n2️⃣ Testing Flow query...');
    const result = await fcl.query({
      cadence: `access(all) fun main(): String { return "Hello Flow!" }`,
      args: () => [],
    });
    console.log(`   Query result: ${result}`);

    // Test 3: FLOW balance query with correct addresses
    console.log('\n3️⃣ Testing FLOW balance query...');
    const balance = await fcl.query({
      cadence: `
        import FungibleToken from 0xee82856bf20e2aa6
        import FlowToken from 0x0ae53cb6e3f42a79

        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)

          if let vaultRef = account.capabilities
            .get<&FlowToken.Vault>(/public/flowTokenBalance)
            .borrow() {
            return vaultRef.balance
          }

          return 0.0
        }
      `,
      args: (arg, t) => [arg('0xf8d6e0586b0a20c7', t.Address)], // Service account
    });
    console.log(`   FLOW balance: ${balance}`);

    console.log('\n✅ All Flow tests passed!');

  } catch (error) {
    console.error('\n❌ Flow test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testFlowDirect().then(() => process.exit(0)).catch(() => process.exit(1));
