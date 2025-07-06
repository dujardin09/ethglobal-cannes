# 🤖 Agent Crypto Flow - ETH Global Cannes

Un agent IA conversationnel pour simplifier les opérations DeFi sur la blockchain Flow.

## 🚀 Démarrage Rapide

### 1. Setup Backend (Serveur de Vaults)
```bash
cd ai-agent-frontend/src/server
node vault-backend-real.js
```

**Dépendances requises :**
```bash
npm install cors ethers express
```

### 2. Setup Agent IA
```bash
cd ai_agent_special
python3 agent_special.py
```

**Dépendances requises :**
```bash
pip install openai asyncio aiohttp uagents
```

**Variable d'environnement requise :**
```bash
export OPENAI_API_KEY="votre_clé_api_openai"
```

### 3. Lancer le Frontend
```bash
cd ai-agent-frontend
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 📋 Ordre de démarrage

1. **Serveur backend** (port par défaut)
2. **Agent IA** (port 8001) 
3. **Frontend** (port 3000)

---

**Développé pour ETH Global Cannes 2024**
