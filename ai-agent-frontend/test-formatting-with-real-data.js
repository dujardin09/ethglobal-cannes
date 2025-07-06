#!/usr/bin/env node

/**
 * Test du formatage avec les vraies données de l'agent
 * 
 * Usage:
 * node test-formatting-with-real-data.js
 */

// Simuler l'environnement Next.js
process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-key';

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

async function testFormattingWithRealData() {
  console.log('🧪 Test du formatage avec les vraies données de l\'agent');
  console.log('=' .repeat(60));

  // Données réelles reçues de l'agent
  const realAgentResponse = {
    success: true,
    message: "🎉 Excellent ! Staking de 100.0 FLOW avec None (fonction à implémenter)",
    function_call: null,
    function_result: "{\n  \"success\": true,\n  \"message\": \"Staking de 100.0 FLOW avec None (fonction \\u00e0 impl\\u00e9menter)\"\n}",
    requires_confirmation: false,
    action_id: null
  };

  console.log('📥 Réponse réelle de l\'agent:');
  console.log(JSON.stringify(realAgentResponse, null, 2));

  // Test du formatage simple
  console.log('\n📤 Test du formatage simple:');
  const actionType = 'stake'; // Détecté à partir du message
  const formattedResult = formatSimpleResult(actionType, realAgentResponse.function_result);
  
  console.log('📝 Résultat formaté:');
  console.log(formattedResult);

  // Test avec un JSON plus complexe
  console.log('\n📤 Test avec un JSON plus complexe:');
  const complexResult = JSON.stringify({
    success: true,
    message: "Vault deposit executed successfully",
    transaction_hash: "0x1234567890abcdef",
    amount: "150.0",
    vault_address: "0xabcd...",
    user_address: "0xuser...",
    timestamp: "2024-01-15T10:30:00Z"
  }, null, 2);

  const formattedComplex = formatSimpleResult('vault', complexResult);
  console.log('📝 Résultat formaté:');
  console.log(formattedComplex);

  console.log('\n✅ Tests terminés !');
  console.log('\n💡 Note: Pour tester avec GPT-4o-mini, configurez NEXT_PUBLIC_OPENAI_API_KEY');
}

// Exécution
if (require.main === module) {
  testFormattingWithRealData().catch(console.error);
} 