#!/usr/bin/env node

/**
 * Script de test pour vérifier la génération d'action_id
 * 
 * Usage:
 * node test-action-id.js
 */

const fetch = require('node-fetch');

// Configuration
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';
const TEST_USER_ID = 'test-action-id-' + Date.now();

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

async function testActionIdGeneration() {
  console.log('🧪 Test de génération d\'action_id');
  console.log('📍 URL de l\'agent:', AGENT_URL);
  console.log('🆔 User ID:', TEST_USER_ID);
  console.log('=' .repeat(50));

  const testMessages = [
    'Je veux staker 100 FLOW',
    'Je veux staker 50 FLOW avec blocto',
    'Je veux échanger 100 FLOW contre USDC',
    'Je veux déposer 200 FLOW dans le vault',
    'Bonjour, que peux-tu faire ?',
    'Combien de FLOW ai-je ?'
  ];

  for (const message of testMessages) {
    console.log(`\n🔍 Test: "${message}"`);
    
    try {
      const response = await makeRequest('/talk', {
        content: message,
        user_id: TEST_USER_ID
      }, 'UserMessage');
      
      if (response.success) {
        console.log('✅ Réponse réussie');
        console.log(`📝 Message: ${response.message}`);
        console.log(`🔗 Requires confirmation: ${response.requires_confirmation}`);
        console.log(`🆔 Action ID: ${response.action_id || 'NULL'}`);
        
        if (response.requires_confirmation && response.action_id) {
          console.log('🎯 CONFIRMATION REQUISE AVEC ACTION_ID !');
          
          // Test de confirmation
          console.log('🔄 Test de confirmation...');
          const confirmResponse = await makeRequest('/confirm', {
            action_id: response.action_id,
            confirmed: true,
            user_id: TEST_USER_ID
          }, 'ConfirmationMessage');
          
          if (confirmResponse.success) {
            console.log('✅ Confirmation réussie !');
          } else {
            console.log('❌ Échec de la confirmation');
          }
        } else if (response.requires_confirmation && !response.action_id) {
          console.log('⚠️  CONFIRMATION REQUISE MAIS PAS D\'ACTION_ID !');
        } else {
          console.log('ℹ️  Pas de confirmation requise');
        }
      } else {
        console.log('❌ Réponse échouée:', response.message);
      }
      
      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }
  }

  console.log('\n✅ Tests terminés !');
}

// Exécution du script
if (require.main === module) {
  testActionIdGeneration().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  testActionIdGeneration
}; 