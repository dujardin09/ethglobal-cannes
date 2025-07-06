#!/usr/bin/env node

/**
 * Test simple pour vérifier la génération d'action_id
 * Basé sur la documentation doc_api.md
 */

const fetch = require('node-fetch');

// Configuration
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';

// Digests de la documentation
const SCHEMA_DIGESTS = {
  UserMessage: '1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723',
  ConfirmationMessage: '737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d'
};

async function testActionId() {
  const userId = 'test-user-' + Date.now();
  
  console.log('🧪 Test de génération d\'action_id');
  console.log('📍 URL:', AGENT_URL);
  console.log('🆔 User ID:', userId);
  console.log('=' .repeat(50));

  try {
    // Test 1: Message simple qui devrait déclencher une confirmation
    console.log('\n📤 Envoi du message: "Je veux staker 100 FLOW"');
    
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

    if (!talkResponse.ok) {
      throw new Error(`HTTP ${talkResponse.status}: ${talkResponse.statusText}`);
    }

    const talkResult = await talkResponse.json();
    console.log('📥 Réponse /talk:', JSON.stringify(talkResult, null, 2));

    // Vérification de la réponse
    console.log('\n📊 Analyse de la réponse:');
    console.log(`✅ Success: ${talkResult.success}`);
    console.log(`🔗 Requires confirmation: ${talkResult.requires_confirmation}`);
    console.log(`🆔 Action ID: "${talkResult.action_id}"`);
    
    if (talkResult.action_id) {
      console.log('✅ Action ID généré avec succès !');
      
      // Test 2: Confirmation de l'action
      console.log('\n📤 Envoi de la confirmation...');
      
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

      if (!confirmResponse.ok) {
        throw new Error(`HTTP ${confirmResponse.status}: ${confirmResponse.statusText}`);
      }

      const confirmResult = await confirmResponse.json();
      console.log('📥 Réponse /confirm:', JSON.stringify(confirmResult, null, 2));
      
      console.log('\n✅ Test complet réussi !');
      
    } else {
      console.log('❌ Aucun action_id généré !');
      console.log('💡 Cela peut indiquer que:');
      console.log('   - L\'IA n\'a pas détecté une action de staking');
      console.log('   - La confiance est trop faible');
      console.log('   - Il y a un problème dans la logique de génération');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécution
if (require.main === module) {
  testActionId().catch(console.error);
}

module.exports = { testActionId }; 