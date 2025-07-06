#!/usr/bin/env node

/**
 * Script de test spécifique pour tester le processus de confirmation
 * 
 * Usage:
 * node test-confirmation.js
 */

const fetch = require('node-fetch');

// Configuration
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';
const TEST_USER_ID = 'test-confirmation-' + Date.now();

// Digests pour les modèles uAgents
const SCHEMA_DIGESTS = {
  UserMessage: '1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723',
  ConfirmationMessage: '737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d'
};

async function makeRequest(endpoint, data, schemaType) {
  const url = `${AGENT_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-uagents-schema-digest': SCHEMA_DIGESTS[schemaType]
  };

  console.log(`📤 ${endpoint}:`, JSON.stringify(data, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`📥 ${endpoint} response:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ ${endpoint} error:`, error.message);
    throw error;
  }
}

async function testConfirmationFlow() {
  console.log('🧪 Test du processus de confirmation');
  console.log('📍 URL de l\'agent:', AGENT_URL);
  console.log('🆔 User ID:', TEST_USER_ID);
  console.log('=' .repeat(50));

  try {
    // 1. Envoyer un message qui déclenche une confirmation
    console.log('\n1️⃣ Envoi d\'un message pour déclencher une confirmation...');
    const talkResponse = await makeRequest('/talk', {
      content: 'Je veux staker 100 FLOW',
      user_id: TEST_USER_ID
    }, 'UserMessage');

    if (!talkResponse.success) {
      console.log('❌ Le message n\'a pas été traité avec succès');
      return;
    }

    // 2. Vérifier si une confirmation est requise
    if (!talkResponse.requires_confirmation || !talkResponse.action_id) {
      console.log('❌ Aucune confirmation requise dans la réponse');
      console.log('Réponse reçue:', talkResponse);
      return;
    }

    console.log('✅ Confirmation requise pour action:', talkResponse.action_id);

    // 3. Tester la confirmation positive
    console.log('\n2️⃣ Test de confirmation positive...');
    const confirmResponse = await makeRequest('/confirm', {
      action_id: talkResponse.action_id,
      confirmed: true,
      user_id: TEST_USER_ID
    }, 'ConfirmationMessage');

    if (confirmResponse.success) {
      console.log('✅ Confirmation positive réussie !');
    } else {
      console.log('❌ Échec de la confirmation positive');
    }

    // 4. Tester un nouveau message pour une nouvelle confirmation
    console.log('\n3️⃣ Test d\'une nouvelle confirmation...');
    const talkResponse2 = await makeRequest('/talk', {
      content: 'Je veux staker 50 FLOW avec blocto',
      user_id: TEST_USER_ID
    }, 'UserMessage');

    if (talkResponse2.requires_confirmation && talkResponse2.action_id) {
      console.log('✅ Nouvelle confirmation requise pour action:', talkResponse2.action_id);

      // 5. Tester la confirmation négative
      console.log('\n4️⃣ Test de confirmation négative...');
      const cancelResponse = await makeRequest('/confirm', {
        action_id: talkResponse2.action_id,
        confirmed: false,
        user_id: TEST_USER_ID
      }, 'ConfirmationMessage');

      if (cancelResponse.success) {
        console.log('✅ Annulation réussie !');
      } else {
        console.log('❌ Échec de l\'annulation');
      }
    }

    // 6. Test d'erreur avec un action_id invalide
    console.log('\n5️⃣ Test avec un action_id invalide...');
    try {
      const invalidResponse = await makeRequest('/confirm', {
        action_id: 'invalid-action-id',
        confirmed: true,
        user_id: TEST_USER_ID
      }, 'ConfirmationMessage');
      
      console.log('📥 Réponse (action_id invalide):', invalidResponse);
    } catch (error) {
      console.log('❌ Erreur attendue avec action_id invalide:', error.message);
    }

    console.log('\n✅ Tests de confirmation terminés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécution du script
if (require.main === module) {
  testConfirmationFlow().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  testConfirmationFlow
}; 