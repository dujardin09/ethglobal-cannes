#!/usr/bin/env node

/**
 * Script de test pour vérifier l'intégration avec l'agent AI
 * 
 * Usage:
 * node test-agent-integration.js
 */

const fetch = require('node-fetch');

// Configuration
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';
const TEST_USER_ID = 'test-user-' + Date.now();

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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Erreur de communication: ${error.message}`);
  }
}

async function testConnection() {
  console.log('🔍 Test de connexion à l\'agent AI...');
  
  try {
    const response = await makeRequest('/talk', {
      content: 'test',
      user_id: TEST_USER_ID
    }, 'UserMessage');
    
    if (response.success) {
      console.log('✅ Connexion réussie !');
      console.log('📝 Réponse:', response.message);
      return true;
    } else {
      console.log('❌ Connexion échouée:', response.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function testConversation() {
  console.log('\n💬 Test de conversation...');
  
  const testMessages = [
    'Bonjour, que peux-tu faire ?',
    'Je veux staker 100 FLOW',
    'Combien de USDC puis-je échanger contre 50 FLOW ?'
  ];

  for (const message of testMessages) {
    console.log(`\n📤 Envoi: "${message}"`);
    
    try {
      const response = await makeRequest('/talk', {
        content: message,
        user_id: TEST_USER_ID
      }, 'UserMessage');
      
      if (response.success) {
        console.log('📥 Réponse:', response.message);
        
        if (response.requires_confirmation && response.action_id) {
          console.log('⚠️  Confirmation requise, action_id:', response.action_id);
          
          // Simuler une confirmation
          console.log('✅ Confirmation de l\'action...');
          const confirmResponse = await makeRequest('/confirm', {
            action_id: response.action_id,
            confirmed: true,
            user_id: TEST_USER_ID
          }, 'ConfirmationMessage');
          
          if (confirmResponse.success) {
            console.log('📥 Réponse de confirmation:', confirmResponse.message);
          }
        }
      } else {
        console.log('❌ Erreur:', response.message);
      }
      
      // Pause entre les messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Test de gestion d\'erreurs...');
  
  // Test avec un message vide
  try {
    const response = await makeRequest('/talk', {
      content: '',
      user_id: TEST_USER_ID
    }, 'UserMessage');
    
    console.log('📥 Réponse (message vide):', response.message);
  } catch (error) {
    console.log('❌ Erreur (message vide):', error.message);
  }
  
  // Test avec un user_id invalide
  try {
    const response = await makeRequest('/talk', {
      content: 'test',
      user_id: ''
    }, 'UserMessage');
    
    console.log('📥 Réponse (user_id vide):', response.message);
  } catch (error) {
    console.log('❌ Erreur (user_id vide):', error.message);
  }
}

async function main() {
  console.log('🤖 Test d\'intégration avec l\'agent AI');
  console.log('📍 URL de l\'agent:', AGENT_URL);
  console.log('🆔 User ID de test:', TEST_USER_ID);
  console.log('=' .repeat(50));
  
  // Test de connexion
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('\n❌ Impossible de se connecter à l\'agent. Vérifiez que :');
    console.log('   1. L\'agent Python est démarré sur le port 8001');
    console.log('   2. L\'URL est correcte:', AGENT_URL);
    console.log('   3. Aucun firewall ne bloque la connexion');
    process.exit(1);
  }
  
  // Test de conversation
  await testConversation();
  
  // Test de gestion d'erreurs
  await testErrorHandling();
  
  console.log('\n✅ Tests terminés avec succès !');
  console.log('\n💡 Pour tester manuellement :');
  console.log('   1. Démarrez le frontend: npm run dev');
  console.log('   2. Ouvrez http://localhost:3000');
  console.log('   3. Connectez votre wallet Flow');
  console.log('   4. Testez la conversation avec l\'agent');
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non gérée:', reason);
  process.exit(1);
});

// Exécution du script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  testConnection,
  testConversation,
  testErrorHandling
}; 