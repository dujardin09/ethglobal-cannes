const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

console.log('🚀 Initialisation du serveur Bridge Crypto (Hybride: Vraies fonctions + Simulation)...');

// Configuration du provider pour les vraies fonctions
let provider = null;
let signer = null;

// Fonction d'initialisation du provider
async function initializeProvider() {
  try {
    // Pour Node.js, on utilise JsonRpcProvider
    const { ethers } = require('ethers');
    
    // Vous pouvez configurer selon votre environnement
    const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Si vous avez une clé privée pour les transactions
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (PRIVATE_KEY) {
      signer = new ethers.Wallet(PRIVATE_KEY, provider);
      console.log('✅ Provider et signer initialisés');
    } else {
      console.log('⚠️ Mode lecture seule (pas de PRIVATE_KEY)');
      signer = provider; // Mode lecture pour les calls
    }
  } catch (error) {
    console.error('⚠️ Erreur initialisation provider, mode simulation:', error.message);
    provider = null;
    signer = null;
  }
}

// Fonction utilitaire pour créer un BrowserProvider simulé
function createSimulatedBrowserProvider() {
  const { ethers } = require('ethers');
  
  // Si on a un vrai provider, on l'utilise
  if (provider) {
    return provider;
  }
  
  // Sinon, on crée un provider simulé
  return new ethers.JsonRpcProvider('http://localhost:8545');
}

// Import dynamique de vos fonctions (avec gestion d'erreur)
let VaultInteractor = null;
try {
  // Tentative d'import de vos fonctions TypeScript
  VaultInteractor = require('../components/VaultInteractor.tsx');
  console.log('✅ Fonctions VaultInteractor importées');
} catch (error) {
  console.log('⚠️ Import VaultInteractor échoué, utilisation de la simulation');
}

// === ENDPOINTS POUR LES FONCTIONS VAULT ===

// 📊 Endpoint: Informations du vault (VRAIE FONCTION)
app.get('/api/vault/info/:vaultAddress', async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: 'Adresse du vault manquante'
      });
    }

    console.log(`📊 [REAL] Récupération infos vault: ${vaultAddress}`);
    console.log(`debug`)

    // Essayer d'utiliser la vraie fonction
    if (VaultInteractor && VaultInteractor.getVaultInfo) {
      try {
        const browserProvider = createSimulatedBrowserProvider();
        const vaultInfo = await VaultInteractor.getVaultInfo(browserProvider, vaultAddress);
        console.log(`✅ Infos vault récupérées via fonction réelle pour ${vaultAddress}`);
        
        res.json({
          success: true,
          message: 'Informations du vault récupérées (fonction réelle)',
          vaultAddress,
          vaultInfo,
          source: 'real_function'
        });
        
        console.log(`✅ Infos vault récupérées via fonction réelle pour ${vaultAddress}`);
        return;
        
      } catch (funcError) {
        console.warn(`⚠️ Fonction réelle échouée pour ${vaultAddress}:`, funcError.message);
        // On continue vers la simulation
      }
    }

    // Fallback : simulation si la vraie fonction échoue
    console.log(`📊 [SIMULATION] Fallback pour vault: ${vaultAddress}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const vaultInfo = {
      vault: {
        address: vaultAddress,
        name: `Vault ${vaultAddress.slice(0, 6)}...`,
        symbol: 'VLT',
        decimals: 18,
        totalAssets: '1000000.0',
        totalSupply: '950000.0',
        sharePrice: 1.05
      },
      asset: {
        address: '0x' + Math.random().toString(16).substring(2, 42),
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18
      }
    };

    res.json({
      success: true,
      message: 'Informations du vault récupérées (simulation)',
      vaultAddress,
      vaultInfo,
      source: 'simulation'
    });

  } catch (error) {
    console.error('Erreur infos vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des infos'
    });
  }
});

// 💼 Endpoint: Portefeuille utilisateur (VRAIE FONCTION)
app.get('/api/vault/portfolio/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur manquante'
      });
    }

    console.log(`💼 [REAL] Récupération portefeuille: ${userAddress}`);

    // Essayer d'utiliser la vraie fonction
    if (VaultInteractor && VaultInteractor.getUserActiveVaults) {
      try {
        const browserProvider = createSimulatedBrowserProvider();
        const activeVaults = await VaultInteractor.getUserActiveVaults(browserProvider, userAddress);
        
        res.json({
          success: true,
          message: `Portefeuille récupéré: ${activeVaults.length} vault(s) actif(s) (fonction réelle)`,
          userAddress,
          activeVaults,
          vaultCount: activeVaults.length,
          source: 'real_function'
        });
        
        console.log(`✅ Portefeuille récupéré via fonction réelle pour ${userAddress}`);
        return;
        
      } catch (funcError) {
        console.warn(`⚠️ Fonction portefeuille réelle échouée pour ${userAddress}:`, funcError.message);
        // On continue vers la simulation
      }
    }

    // Fallback : simulation
    console.log(`💼 [SIMULATION] Fallback portefeuille pour: ${userAddress}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const activeVaults = [
      {
        vaultAddress: '0x1234567890abcdef1234567890abcdef12345678',
        vaultName: 'Test Vault 1',
        vaultSymbol: 'TV1',
        assetAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        assetSymbol: 'TEST',
        assetDecimals: 18,
        vaultDecimals: 18,
        firstDepositDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastInteractionDate: new Date().toISOString(),
        totalDeposited: '1000.0',
        currentShares: '950.0',
        currentValue: '1050.0'
      }
    ];

    res.json({
      success: true,
      message: `Portefeuille récupéré: ${activeVaults.length} vault(s) actif(s) (simulation)`,
      userAddress,
      activeVaults,
      vaultCount: activeVaults.length,
      source: 'simulation'
    });

  } catch (error) {
    console.error('Erreur portefeuille:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du portefeuille'
    });
  }
});

// 🏦 Endpoint: Déposer dans un vault (SIMULATION pour l'instant)
app.post('/api/vault/deposit', async (req, res) => {
  try {
    const { vaultAddress, assetAddress, decimals, userAddress, amount } = req.body;
    
    if (!vaultAddress || !assetAddress || !decimals || !userAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: vaultAddress, assetAddress, decimals, userAddress, amount'
      });
    }

    console.log(`🏦 [SIMULATION] Dépôt dans vault: ${amount} tokens pour ${userAddress}`);

    // Pour l'instant, on garde la simulation pour les transactions
    // Vous pourrez ajouter la vraie fonction plus tard avec la gestion des wallets
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const expectedShares = (parseFloat(amount) * 0.98).toString();

    res.json({
      success: true,
      message: `Dépôt de ${amount} tokens réussi`,
      transactionHash: simulatedTxHash,
      expectedShares: expectedShares,
      vaultAddress,
      amount,
      source: 'simulation',
      result: {
        success: true,
        txHash: simulatedTxHash,
        expectedShares: expectedShares
      }
    });

  } catch (error) {
    console.error('Erreur dépôt vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du dépôt'
    });
  }
});

// 💰 Endpoint: Retirer d'un vault (SIMULATION)
app.post('/api/vault/withdraw', async (req, res) => {
  try {
    const { vaultAddress, assetDecimals, userAddress, amount } = req.body;
    
    if (!vaultAddress || !assetDecimals || !userAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: vaultAddress, assetDecimals, userAddress, amount'
      });
    }

    console.log(`💰 [SIMULATION] Retrait du vault: ${amount} tokens pour ${userAddress}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const sharesUsed = (parseFloat(amount) * 1.02).toString();

    res.json({
      success: true,
      message: `Retrait de ${amount} tokens réussi`,
      transactionHash: simulatedTxHash,
      sharesUsed: sharesUsed,
      vaultAddress,
      amount,
      source: 'simulation',
      result: {
        success: true,
        txHash: simulatedTxHash,
        sharesUsed: sharesUsed
      }
    });

  } catch (error) {
    console.error('Erreur retrait vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du retrait'
    });
  }
});

// 🔄 Endpoint: Racheter des shares (SIMULATION)
app.post('/api/vault/redeem', async (req, res) => {
  try {
    const { vaultAddress, userAddress, shares } = req.body;
    
    if (!vaultAddress || !userAddress || !shares) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: vaultAddress, userAddress, shares'
      });
    }

    console.log(`🔄 [SIMULATION] Rachat de shares: ${shares} pour ${userAddress}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const assetsReceived = (parseFloat(shares) * 0.97).toString();

    res.json({
      success: true,
      message: `Rachat de ${shares} shares réussi`,
      transactionHash: simulatedTxHash,
      assetsReceived: assetsReceived,
      vaultAddress,
      shares,
      source: 'simulation',
      result: {
        success: true,
        txHash: simulatedTxHash,
        assetsReceived: assetsReceived
      }
    });

  } catch (error) {
    console.error('Erreur rachat vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du rachat'
    });
  }
});

// 📊 Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'hybrid',
    vaultInteractor: VaultInteractor ? 'loaded' : 'not_loaded',
    provider: provider ? 'connected' : 'not_connected',
    timestamp: new Date().toISOString(),
    services: ['vault-deposit', 'vault-withdraw', 'vault-redeem', 'vault-info', 'portfolio'],
    version: '2.0.0-hybrid'
  });
});

// Initialiser et démarrer le serveur
async function startServer() {
  await initializeProvider();
  
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Crypto Bridge API Server (HYBRIDE) démarré !');
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log(`   POST /api/vault/deposit     (simulation)`);
    console.log(`   POST /api/vault/withdraw    (simulation)`);
    console.log(`   POST /api/vault/redeem      (simulation)`);
    console.log(`   GET  /api/vault/info/:addr  (vraie fonction)`);
    console.log(`   GET  /api/vault/portfolio/:addr (vraie fonction + fallback)`);
    console.log(`   GET  /health`);
    console.log('');
    console.log('🔧 Mode HYBRIDE:');
    console.log(`   - VaultInteractor: ${VaultInteractor ? '✅ Chargé' : '❌ Non chargé'}`);
    console.log(`   - Provider: ${provider ? '✅ Connecté' : '❌ Non connecté'}`);
    console.log(`   - Fallback simulation disponible pour toutes les fonctions`);
    console.log('');
    console.log('✅ Serveur prêt à recevoir des requêtes');
  });
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

startServer().catch(console.error);

module.exports = app;
