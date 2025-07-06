# 🤖 Intégration de l'Agent AI

Ce guide explique comment connecter le frontend Next.js à l'agent AI Python pour permettre une conversation naturelle avec l'assistant DeFi.

## 📋 Prérequis

1. **Agent AI démarré** : L'agent Python doit être en cours d'exécution sur le port 8001
2. **Variables d'environnement configurées** : Voir la section configuration ci-dessous

## ⚙️ Configuration

### 1. Variables d'Environnement

Créez un fichier `.env.local` dans le dossier `ai-agent-frontend/` avec le contenu suivant :

```bash
# Configuration de l'agent AI
NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8001

# Configuration Flow
NEXT_PUBLIC_FLOW_NETWORK=emulator
NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
```

### 2. Démarrage de l'Agent AI

Dans le dossier `ai_agent_special/`, démarrez l'agent :

```bash
cd ai_agent_special
python agent_special.py
```

L'agent sera disponible sur `http://127.0.0.1:8001`

### 3. Démarrage du Frontend

Dans le dossier `ai-agent-frontend/`, démarrez le serveur de développement :

```bash
cd ai-agent-frontend
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

## 🔄 Flux de Communication

### 1. Test de Connexion

Au démarrage, le frontend teste automatiquement la connexion à l'agent AI :
- ✅ **Connecté** : L'indicateur affiche "AI Connected" en vert
- ❌ **Déconnecté** : L'indicateur affiche "AI Disconnected" en rouge

### 2. Envoi de Messages

1. L'utilisateur tape un message dans l'interface de chat
2. Le frontend envoie le message à l'agent via l'API REST
3. L'agent analyse le message avec l'IA et répond
4. La réponse s'affiche dans l'interface

### 3. Confirmation d'Actions

Si l'agent demande une confirmation :
1. Des boutons "Confirmer" / "Annuler" apparaissent
2. L'utilisateur clique sur un bouton
3. Le frontend envoie la confirmation à l'agent
4. L'agent exécute l'action et confirme

## 🛠️ Architecture Technique

### Services Frontend

- **`agent-api.ts`** : Service pour communiquer avec l'agent AI
- **`useAgentChat.ts`** : Hook React pour gérer l'état de la conversation
- **`ConfirmationButtons.tsx`** : Composant pour les confirmations

### Endpoints de l'Agent

- **`POST /talk`** : Envoi de messages utilisateur
- **`POST /confirm`** : Confirmation d'actions
- **Headers requis** : `x-uagents-schema-digest` pour la validation

### Types de Messages

- **`UserMessage`** : Message utilisateur normal
- **`ConfirmationMessage`** : Confirmation d'action
- **`ActionResponse`** : Réponse de l'agent

## 🧪 Tests

### Test de Connexion Manuel

Cliquez sur l'icône de rafraîchissement dans l'en-tête du chat pour tester manuellement la connexion.

### Test de Conversation

Essayez ces exemples de messages :

```
"Bonjour, que peux-tu faire ?"
"Je veux staker 100 FLOW"
"Combien de USDC puis-je échanger contre 50 FLOW ?"
"Montre-moi mon solde de vault"
```

## 🐛 Dépannage

### Agent Non Connecté

1. Vérifiez que l'agent Python est démarré :
   ```bash
   cd ai_agent_special
   python agent_special.py
   ```

2. Vérifiez que le port 8001 est libre :
   ```bash
   netstat -tulpn | grep 8001
   ```

3. Vérifiez les logs de l'agent pour les erreurs

### Erreurs de Communication

1. Vérifiez la variable `NEXT_PUBLIC_AGENT_URL` dans `.env.local`
2. Vérifiez que l'agent répond sur l'endpoint `/submit`
3. Vérifiez les logs du navigateur (F12) pour les erreurs CORS

### Variables d'Environnement

1. Redémarrez le serveur Next.js après modification de `.env.local`
2. Vérifiez que les variables commencent par `NEXT_PUBLIC_`
3. Vérifiez la syntaxe du fichier `.env.local`

## 📚 Ressources

- [Documentation API de l'Agent](../doc_api.md)
- [Guide d'Installation](../README.md)
- [Configuration Flow](../ai-agent-frontend/FLOW_EMULATOR_SETUP.md)
