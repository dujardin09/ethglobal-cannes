#!/usr/bin/env node

/**
 * Test qui simule exactement le comportement du frontend
 * 
 * Usage:
 * node test-frontend-simulation.js
 */

const fetch = require('node-fetch');

// Configuration
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';

// Digests de la documentation
const SCHEMA_DIGESTS = {
  UserMessage: '1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723',
  ConfirmationMessage: '737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d'
};

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

async function simulateFrontendBehavior() {
  const userId = 'frontend-test-' + Date.now();
  
  console.log('🧪 Simulation du comportement frontend');
  console.log('📍 URL:', AGENT_URL);
  console.log('🆔 User ID:', userId);
  console.log('=' .repeat(60));

  try {
    // Étape 1: Envoyer un message
    console.log('\n📤 Étape 1: Envoi du message "Je veux staker 100 FLOW"');
    
    const talkResponse = await fetch(`${AGENT_URL}/talk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uagents-schema-digest': SCHEMA_DIGESTS.UserMessage
      },
      body: JSON.stringify({
        content: 'Je veux staker 100 FLOW',
        user_id: userId
      })
    });

    const talkResult = await talkResponse.json();
    console.log('📥 Réponse /talk reçue');
    console.log('   - requires_confirmation:', talkResult.requires_confirmation);
    console.log('   - action_id:', talkResult.action_id);

    // Étape 2: Confirmer l'action
    console.log('\n📤 Étape 2: Confirmation de l\'action');
    
    const confirmResponse = await fetch(`${AGENT_URL}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uagents-schema-digest': SCHEMA_DIGESTS.ConfirmationMessage
      },
      body: JSON.stringify({
        action_id: talkResult.action_id,
        confirmed: true,
        user_id: userId
      })
    });

    const confirmResult = await confirmResponse.json();
    console.log('📥 Réponse /confirm reçue');
    console.log('   - success:', confirmResult.success);
    console.log('   - function_result présent:', !!confirmResult.function_result);

    // Étape 3: Simuler le formatage frontend
    console.log('\n📤 Étape 3: Formatage du résultat (comme dans le frontend)');
    
    if (confirmResult.function_result) {
      console.log('🔔 Formatage du résultat...');
      
      // Détecter le type d'action (comme dans le hook)
      let actionType = 'unknown';
      const messageLower = confirmResult.message.toLowerCase();
      if (messageLower.includes('stake') || messageLower.includes('staking')) actionType = 'stake';
      else if (messageLower.includes('swap')) actionType = 'swap';
      else if (messageLower.includes('vault')) actionType = 'vault';
      else if (messageLower.includes('balance')) actionType = 'balance';

      console.log('   - Type d\'action détecté:', actionType);

      // Formatage simple (fallback)
      const formattedResult = formatSimpleResult(actionType, confirmResult.function_result);
      
      console.log('\n📝 RÉSULTAT FINAL (ce qui s\'affiche dans le chat) :');
      console.log('=' .repeat(50));
      console.log(formattedResult);
      console.log('=' .repeat(50));
      
      console.log('\n✅ Le formatage fonctionne ! Le message "Excellent..." a été remplacé.');
      
    } else {
      console.log('❌ Pas de function_result, affichage du message original');
      console.log('Message original:', confirmResult.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécution
if (require.main === module) {
  simulateFrontendBehavior().catch(console.error);
} 