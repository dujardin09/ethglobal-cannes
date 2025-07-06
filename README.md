# 🤖 Agent Crypto Flow - ETH Global Cannes

Un agent IA conversationnel pour simplifier les opérations DeFi sur la blockchain Flow. Ce projet combine une interface utilisateur moderne avec un agent IA intelligent pour rendre les opérations cryptographiques accessibles à tous.

## 🚀 Fonctionnalités

- **🤖 Agent IA Conversationnel** : Interface en langage naturel pour les opérations DeFi
- **💰 Opérations DeFi Complètes** : Staking, swapping, gestion de vaults
- **🔗 Intégration Flow Blockchain** : Support complet de la blockchain Flow
- **📱 Interface Moderne** : Frontend React/Next.js avec design responsive
- **🔄 Mémoire de Conversation** : L'agent garde le contexte des conversations
- **⚡ API REST** : Endpoints pour intégration facile

## 🏗️ Architecture

Le projet se compose de plusieurs composants :

```
ethglobal-cannes/
├── ai_agent_special/          # Agent IA Python avec uAgents
├── ai-agent-frontend/         # Interface utilisateur Next.js
├── src/                       # Smart contracts Solidity (Foundry)
├── lib/                       # Dépendances Foundry
├── script/                    # Scripts de déploiement
└── test/                      # Tests
```

## 🛠️ Installation et Configuration

### Prérequis

- **Python 3.8+** avec pip
- **Node.js 18+** avec npm
- **Foundry** (pour les smart contracts)
- **Clé API OpenAI** (pour l'agent IA)

### 1. Configuration de l'Agent IA

```bash
# Installer les dépendances Python
pip install -r requirements.txt

# Configurer la clé API OpenAI
export OPENAI_API_KEY="votre_clé_api_openai"

# Aller dans le dossier de l'agent
cd ai_agent_special

# Installer les dépendances supplémentaires
pip install uagents openai aiohttp
```

### 2. Configuration du Frontend

```bash
# Aller dans le dossier frontend
cd ai-agent-frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

### 3. Configuration Foundry (Smart Contracts)

```bash
# Installer Foundry (si pas déjà fait)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Installer les dépendances
forge install

# Compiler les contrats
forge build
```

## 🚀 Démarrage Rapide

### 1. Démarrer l'Agent IA

```bash
cd ai_agent_special
python agent_special.py
```

L'agent sera disponible sur `http://127.0.0.1:8001`

### 2. Démarrer le Frontend

```bash
cd ai-agent-frontend
npm run dev
```

L'interface sera disponible sur `http://localhost:3000`

### 3. Démarrer l'Émulateur Flow (Optionnel)

```bash
# Démarrer l'émulateur Flow
flow emulator start

# Dans un autre terminal, démarrer le Dev Wallet
flow dev-wallet
```

## 📚 Utilisation

### Interface Conversationnelle

L'agent IA comprend les demandes en langage naturel :

- **"Je veux staker 100 FLOW"**
- **"Combien de USDC puis-je échanger contre 50 FLOW ?"**
- **"Montre-moi mon solde de vault"**
- **"Je veux déposer 200 FLOW dans le vault"**

### API REST

L'agent expose des endpoints REST pour l'intégration :

```bash
# Envoyer un message
curl -X POST http://127.0.0.1:8001/submit \
  -H "Content-Type: application/json" \
  -H "x-uagents-schema-digest: 1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723" \
  -d '{
    "content": "Je veux staker 100 FLOW",
    "user_id": "user-123"
  }'
```

## 🔧 Configuration Avancée

### Variables d'Environnement

```bash
# Agent IA
OPENAI_API_KEY=votre_clé_api_openai
AGENT_PORT=8001

# Frontend
NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8001
NEXT_PUBLIC_FLOW_NETWORK=emulator
```

### Modes d'Exécution de l'Agent

```bash
# Mode API REST (par défaut)
python agent_special.py

# Mode interactif (terminal)
python agent_special.py interactive

# Mode test
python agent_special.py test
```

## 🧪 Tests

### Tests de l'Agent IA

```bash
cd ai_agent_special
python agent_special.py test
```

### Tests des Smart Contracts

```bash
forge test
```

### Tests du Frontend

```bash
cd ai-agent-frontend
npm run test
```

## 📖 Documentation

- **[Documentation API](doc_api.md)** : Documentation complète de l'API de l'agent
- **[Intégration Swap](ai-agent-frontend/SWAP_INTEGRATION.md)** : Guide d'intégration des swaps
- **[README Frontend](ai-agent-frontend/README.md)** : Documentation détaillée du frontend

## 🔌 Intégrations

### Blockchain Flow

- **@onflow/kit** : Intégration Flow blockchain
- **@onflow/fcl** : Flow Client Library
- **Smart Contracts Cadence** : Contrats déployés sur Flow

### IA et NLP

- **OpenAI GPT** : Modèle de langage pour la compréhension
- **uAgents** : Framework pour agents autonomes
- **Mémoire de Conversation** : Gestion du contexte utilisateur

### Frontend

- **Next.js 15** : Framework React moderne
- **TypeScript** : Développement type-safe
- **Tailwind CSS** : Styling utilitaire
- **Lucide React** : Icônes modernes

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est développé pour ETH Global Cannes. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :

1. Consulter la [documentation API](doc_api.md)
2. Vérifier les [issues GitHub](../../issues)
3. Contacter l'équipe de développement

---

**Développé avec ❤️ pour ETH Global Cannes 2024**
