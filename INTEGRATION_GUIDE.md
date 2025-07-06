# 🔗 Guide d'Intégration Complète - Agent AI + Frontend + Backend

Ce guide explique comment connecter tous les composants de votre application : l'agent AI Python, le frontend Next.js, et les smart contracts Flow.

## 🏗️ Architecture Globale

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   Frontend      │ ◄──────────────► │   Agent AI      │
│   Next.js       │                 │   Python        │
│   (Port 3000)   │                 │   (Port 8001)   │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   Flow          │                 │   Smart         │
│   Blockchain    │                 │   Contracts     │
│   (Emulator)    │                 │   (Cadence)     │
└─────────────────┘                 └─────────────────┘
```

## 📋 Prérequis

### 1. Environnement de Développement
- **Python 3.8+** avec pip
- **Node.js 18+** avec npm
- **Foundry** (pour les smart contracts)
- **Flow CLI** (pour l'émulateur Flow)

### 2. Clés API
- **OpenAI API Key** pour l'agent AI

## 🚀 Installation et Configuration

### Étape 1 : Configuration de l'Agent AI

```bash
# 1. Installer les dépendances Python
pip install -r requirements.txt

# 2. Configurer la clé API OpenAI
export OPENAI_API_KEY="votre_clé_api_openai"

# 3. Aller dans le dossier de l'agent
cd ai_agent_special

# 4. Installer les dépendances supplémentaires
pip install uagents openai aiohttp

# 5. Démarrer l'agent
python agent_special.py
```

L'agent sera disponible sur `http://127.0.0.1:8001`

### Étape 2 : Configuration du Frontend

```bash
# 1. Aller dans le dossier frontend
cd ai-agent-frontend

# 2. Installer les dépendances
npm install

# 3. Créer le fichier de configuration
cat > .env.local << EOF
# Configuration de l'agent AI
NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8001

# Configuration Flow
NEXT_PUBLIC_FLOW_NETWORK=emulator
NEXT_PUBLIC_FLOW_ACCESS_NODE=http://localhost:8888
EOF

# 4. Démarrer le serveur de développement
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

### Étape 3 : Configuration de l'Émulateur Flow

```bash
# 1. Démarrer l'émulateur Flow
flow emulator start

# 2. Dans un autre terminal, démarrer le Dev Wallet
flow dev-wallet
```

## 🧪 Tests d'Intégration

### Test Automatique

```bash
# Dans le dossier frontend
cd ai-agent-frontend

# Tester l'intégration avec l'agent
npm run test:agent
```

### Test Manuel

1. **Ouvrir le frontend** : http://localhost:3000
2. **Connecter le wallet** : Utilisez le bouton "Connect Wallet"
3. **Tester la conversation** : Tapez des messages comme :
   - "Bonjour, que peux-tu faire ?"
   - "Je veux staker 100 FLOW"
   - "Combien de USDC puis-je échanger contre 50 FLOW ?"

## 🔄 Flux de Communication

### 1. Conversation Normale

```
Utilisateur → Frontend → Agent AI → Réponse → Frontend → Utilisateur
```

### 2. Action avec Confirmation

```
Utilisateur → Frontend → Agent AI → Demande Confirmation → Frontend
Frontend → Utilisateur (boutons Confirmer/Annuler)
Utilisateur → Frontend → Agent AI → Exécution → Frontend → Utilisateur
```

### 3. Intégration Blockchain

```
Agent AI → Smart Contracts → Flow Blockchain → Résultat → Agent AI → Frontend
```

## 🛠️ Composants Techniques

### Frontend (Next.js)

- **`src/services/agent-api.ts`** : Service pour communiquer avec l'agent
- **`src/hooks/useAgentChat.ts`** : Hook React pour gérer la conversation
- **`src/components/ChatInterface.tsx`** : Interface de chat avec l'agent
- **`src/components/ConfirmationButtons.tsx`** : Boutons de confirmation

### Agent AI (Python)

- **`agent_special.py`** : Agent principal avec API REST
- **`crypto_functions/`** : Fonctions pour les opérations blockchain
- **`simple_api.py`** : API alternative simplifiée

### Smart Contracts (Cadence)

- **`src/`** : Contrats Cadence pour Flow
- **`script/`** : Scripts de déploiement
- **`test/`** : Tests des contrats

## 📊 Monitoring et Debug

### Logs de l'Agent AI

```bash
# Voir les logs en temps réel
cd ai_agent_special
python agent_special.py 2>&1 | tee agent.log
```

### Logs du Frontend

```bash
# Voir les logs Next.js
cd ai-agent-frontend
npm run dev 2>&1 | tee frontend.log
```

### Logs de l'Émulateur Flow

```bash
# Voir les logs de l'émulateur
flow emulator start --log-level debug
```

## 🐛 Dépannage

### Agent Non Connecté

**Symptômes** : Indicateur rouge "AI Disconnected"

**Solutions** :
1. Vérifier que l'agent Python est démarré
2. Vérifier le port 8001 : `netstat -tulpn | grep 8001`
3. Vérifier la variable `NEXT_PUBLIC_AGENT_URL`
4. Vérifier les logs de l'agent

### Erreurs CORS

**Symptômes** : Erreurs dans la console du navigateur

**Solutions** :
1. Vérifier que l'agent accepte les requêtes depuis `localhost:3000`
2. Ajouter les headers CORS appropriés dans l'agent
3. Vérifier la configuration du proxy Next.js

### Wallet Non Connecté

**Symptômes** : Bouton "Connect Wallet" grisé

**Solutions** :
1. Vérifier que l'émulateur Flow est démarré
2. Vérifier que le Dev Wallet est actif
3. Vérifier la configuration Flow dans le frontend

### Erreurs de Smart Contracts

**Symptômes** : Erreurs lors des transactions

**Solutions** :
1. Vérifier que les contrats sont déployés
2. Vérifier les permissions du wallet
3. Vérifier les logs de l'émulateur Flow

## 🔧 Configuration Avancée

### Variables d'Environnement

#### Frontend (.env.local)
```bash
# Agent AI
NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8001

# Flow
NEXT_PUBLIC_FLOW_NETWORK=emulator
NEXT_PUBLIC_FLOW_ACCESS_NODE=http://localhost:8888

# Développement
NEXT_PUBLIC_DEBUG=true
```

#### Agent AI (variables système)
```bash
# OpenAI
export OPENAI_API_KEY="votre_clé_api_openai"

# Agent
export AGENT_PORT=8001
export AGENT_SEED="flow_crypto_agent_final_seed_rest"

# Développement
export DEBUG=true
```

### Configuration Flow

#### flow.json
```json
{
  "networks": {
    "emulator": "127.0.0.1:8888"
  },
  "accounts": {
    "emulator-account": {
      "address": "f8d6e0586b0a20c7",
      "key": "21cae42b0dbf30a1e..."
    }
  }
}
```

## 📚 Ressources

- [Documentation API de l'Agent](doc_api.md)
- [Guide d'Intégration Frontend](ai-agent-frontend/AGENT_INTEGRATION.md)
- [Configuration Flow](ai-agent-frontend/FLOW_EMULATOR_SETUP.md)
- [Documentation uAgents](https://docs.uagents.ai/)

## 🤝 Support

Pour toute question ou problème :

1. Consulter les logs des différents composants
2. Vérifier la configuration des variables d'environnement
3. Tester chaque composant individuellement
4. Consulter la documentation spécifique de chaque composant

---

**Développé avec ❤️ pour ETH Global Cannes 2024** 