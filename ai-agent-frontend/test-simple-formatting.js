#!/usr/bin/env node

/**
 * Test simple du formatage des résultats
 * 
 * Usage:
 * node test-simple-formatting.js
 */

// Simuler l'environnement Next.js
process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-key';

// Test simple du formatage sans API OpenAI
function testSimpleFormatting() {
  console.log('🧪 Test du formatage simple (sans API OpenAI)');
  console.log('=' .repeat(50));

  // Simuler le service de formatage
  function formatSimpleResult(actionType, functionResult) {
    try {
      const result = JSON.parse(functionResult);
      
      if (result.success) {
        return `🎉 ${result.message || 'Opération réussie !'}`;
      } else {
        return `❌ ${result.message || 'Une erreur est survenue'}`;
      }
    } catch {
      return functionResult;
    }
  }

  // Test 1: Succès
  console.log('\n📤 Test 1: Résultat de succès');
  const successResult = JSON.stringify({
    success: true,
    message: "Staking operation completed successfully",
    amount: "150.0"
  });
  
  const formattedSuccess = formatSimpleResult('stake', successResult);
  console.log('📝 Résultat formaté:');
  console.log(formattedSuccess);

  // Test 2: Erreur
  console.log('\n📤 Test 2: Résultat d\'erreur');
  const errorResult = JSON.stringify({
    success: false,
    message: "Insufficient balance",
    error_code: "INSUFFICIENT_BALANCE"
  });
  
  const formattedError = formatSimpleResult('vault', errorResult);
  console.log('📝 Résultat formaté:');
  console.log(formattedError);

  // Test 3: JSON invalide
  console.log('\n📤 Test 3: JSON invalide');
  const invalidResult = "Ceci n'est pas du JSON";
  
  const formattedInvalid = formatSimpleResult('swap', invalidResult);
  console.log('📝 Résultat formaté:');
  console.log(formattedInvalid);

  console.log('\n✅ Tests terminés !');
}

// Exécution
if (require.main === module) {
  testSimpleFormatting();
} 