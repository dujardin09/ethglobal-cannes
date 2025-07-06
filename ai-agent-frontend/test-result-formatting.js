#!/usr/bin/env node

/**
 * Test du formatage des résultats avec GPT-4o-mini
 * 
 * Usage:
 * node test-result-formatting.js
 */

const { resultFormatter } = require('./src/services/result-formatter');

async function testResultFormatting() {
  console.log('🧪 Test du formatage des résultats avec GPT-4o-mini');
  console.log('=' .repeat(60));

  // Test 1: Résultat de succès pour un stake
  console.log('\n📤 Test 1: Résultat de succès pour un stake');
  const stakeResult = {
    success: true,
    message: "Staking operation completed successfully",
    transaction_hash: "0x1234567890abcdef",
    amount: "150.0",
    validator: "blocto"
  };

  const formattedStake = await resultFormatter.formatResult({
    actionType: 'stake',
    functionResult: JSON.stringify(stakeResult, null, 2),
    userMessage: 'Je veux staker 150 FLOW avec blocto'
  });

  console.log('✅ Formatage réussi:', formattedStake.success);
  console.log('📝 Message formaté:');
  console.log(formattedStake.formattedMessage);

  // Test 2: Résultat d'erreur pour un vault
  console.log('\n📤 Test 2: Résultat d\'erreur pour un vault');
  const vaultErrorResult = {
    success: false,
    message: "Insufficient balance for vault deposit",
    error_code: "INSUFFICIENT_BALANCE",
    required_amount: "200.0",
    available_amount: "150.0"
  };

  const formattedVaultError = await resultFormatter.formatResult({
    actionType: 'vault',
    functionResult: JSON.stringify(vaultErrorResult, null, 2),
    userMessage: 'Je veux déposer 200 FLOW dans le vault'
  });

  console.log('✅ Formatage réussi:', formattedVaultError.success);
  console.log('📝 Message formaté:');
  console.log(formattedVaultError.formattedMessage);

  // Test 3: Résultat de succès pour un swap
  console.log('\n📤 Test 3: Résultat de succès pour un swap');
  const swapResult = {
    success: true,
    message: "Token swap executed successfully",
    transaction_hash: "0xfedcba0987654321",
    from_token: "FLOW",
    to_token: "USDC",
    from_amount: "100.0",
    to_amount: "95.5",
    slippage: "0.5%"
  };

  const formattedSwap = await resultFormatter.formatResult({
    actionType: 'swap',
    functionResult: JSON.stringify(swapResult, null, 2),
    userMessage: 'Je veux échanger 100 FLOW contre USDC'
  });

  console.log('✅ Formatage réussi:', formattedSwap.success);
  console.log('📝 Message formaté:');
  console.log(formattedSwap.formattedMessage);

  // Test 4: Test du formatage simple (fallback)
  console.log('\n📤 Test 4: Formatage simple (fallback)');
  const simpleResult = resultFormatter.formatSimpleResult('stake', JSON.stringify({
    success: true,
    message: 'Staking successful'
  }));
  
  console.log('📝 Résultat simple:');
  console.log(simpleResult);

  console.log('\n✅ Tests terminés !');
}

// Exécution du script
if (require.main === module) {
  testResultFormatting().catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
}

module.exports = {
  testResultFormatting
}; 