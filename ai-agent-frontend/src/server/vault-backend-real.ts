import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import {
  getVaultInfo,
  getUserActiveVaults,
  depositToVault,
  withdrawFromVault,
  redeemFromVault,
  getUserBalances,
  displayUserPortfolio
} from '../components/VaultInteractor';

// Types compatibles pour Express 5.x
type Request = express.Request;
type Response = express.Response;

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

console.log('🚀 Initialisation du serveur Backend Crypto (Vraies fonctions)...');

// Configuration du provider
let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;

// Fonction d'initialisation du provider
async function initializeProvider() {
  try {
    // Configuration du RPC (adaptez selon votre setup Flow/Ethereum)
    const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Configuration du wallet pour les transactions
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY est requis pour les transactions');
    }
    
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('✅ Provider et signer initialisés');
    console.log(`📡 RPC URL: ${RPC_URL}`);
    console.log(`🔑 Wallet address: ${await signer.getAddress()}`);
    
    // Test de connexion
    const network = await provider.getNetwork();
    console.log(`🌐 Réseau connecté: ${network.name} (chainId: ${network.chainId})`);
    
  } catch (error) {
    console.error('❌ Erreur initialisation provider:', error);
    throw error;
  }
}

// Fonction utilitaire pour créer un BrowserProvider compatible
function createBrowserProvider(): any {
  // Adapter le JsonRpcProvider pour être compatible avec vos fonctions
  return provider;
}

// === ENDPOINTS UTILISANT VOS VRAIES FONCTIONS ===

// 📊 Endpoint: Informations du vault (VRAIE FONCTION)
app.get('/api/vault/info/:vaultAddress', async (req: Request, res: Response) => {
  try {
    const { vaultAddress } = req.params;
    
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse du vault invalide'
      });
    }

    console.log(`📊 [REAL] Récupération infos vault: ${vaultAddress}`);

    // Utiliser votre vraie fonction getVaultInfo
    const browserProvider = createBrowserProvider();
    const vaultInfo = await getVaultInfo(browserProvider, vaultAddress);
    
    console.log(`✅ Infos vault récupérées pour ${vaultAddress}`);
    
    res.json({
      success: true,
      message: 'Informations du vault récupérées',
      vaultAddress,
      vaultInfo,
      source: 'real_function'
    });

  } catch (error: any) {
    console.error('❌ Erreur infos vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des infos du vault'
    });
  }
});

// 💼 Endpoint: Portefeuille utilisateur (VRAIE FONCTION)
app.get('/api/vault/portfolio/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`💼 [REAL] Récupération portefeuille: ${userAddress}`);

    // Utiliser votre vraie fonction getUserActiveVaults
    const browserProvider = createBrowserProvider();
    const activeVaults = await getUserActiveVaults(browserProvider, userAddress);
    
    console.log(`✅ Portefeuille récupéré: ${activeVaults.length} vault(s) pour ${userAddress}`);
    
    res.json({
      success: true,
      message: `Portefeuille récupéré: ${activeVaults.length} vault(s) actif(s)`,
      userAddress,
      activeVaults,
      vaultCount: activeVaults.length,
      source: 'real_function'
    });

  } catch (error: any) {
    console.error('❌ Erreur portefeuille:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du portefeuille'
    });
  }
});

// 💰 Endpoint: Soldes utilisateur (VRAIE FONCTION)
app.get('/api/vault/balances/:userAddress/:vaultAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress, vaultAddress } = req.params;
    const { assetAddress, assetDecimals, vaultDecimals } = req.query;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }
    
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse vault invalide'
      });
    }
    
    if (!assetAddress || !assetDecimals || !vaultDecimals) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: assetAddress, assetDecimals, vaultDecimals'
      });
    }

    console.log(`💰 [REAL] Vérification soldes: ${userAddress} pour vault ${vaultAddress}`);

    // Utiliser votre vraie fonction getUserBalances
    const browserProvider = createBrowserProvider();
    const balances = await getUserBalances(
      browserProvider,
      userAddress,
      vaultAddress,
      assetAddress as string,
      parseInt(assetDecimals as string),
      parseInt(vaultDecimals as string)
    );
    
    console.log(`✅ Soldes récupérés pour ${userAddress}`);
    
    res.json({
      success: true,
      message: 'Soldes récupérés',
      userAddress,
      vaultAddress,
      balances,
      source: 'real_function'
    });

  } catch (error: any) {
    console.error('❌ Erreur soldes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification des soldes'
    });
  }
});

// 🏦 Endpoint: Déposer dans un vault (VRAIE FONCTION)
app.post('/api/vault/deposit', async (req: Request, res: Response) => {
  try {
    const { vaultAddress, assetAddress, decimals, userAddress, amount } = req.body;
    
    // Validation des paramètres
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse vault invalide'
      });
    }
    
    if (!assetAddress || !ethers.isAddress(assetAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse asset invalide'
      });
    }
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide'
      });
    }

    console.log(`🏦 [REAL] Dépôt dans vault: ${amount} tokens pour ${userAddress}`);

    // Préparer les paramètres pour votre fonction
    const vaultInfo = {
      vaultAddress,
      assetAddress,
      decimals: parseInt(decimals)
    };

    // Utiliser votre vraie fonction depositToVault
    const browserProvider = createBrowserProvider();
    const result = await depositToVault(
      browserProvider,
      signer,
      vaultInfo,
      userAddress,
      amount.toString()
    );
    
    console.log(`✅ Dépôt réussi: ${result.txHash}`);
    
    res.json({
      success: true,
      message: `Dépôt de ${amount} tokens réussi`,
      transactionHash: result.txHash,
      expectedShares: result.expectedShares,
      vaultAddress,
      amount,
      source: 'real_function',
      result
    });

  } catch (error: any) {
    console.error('❌ Erreur dépôt vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du dépôt'
    });
  }
});

// 💰 Endpoint: Retirer d'un vault (VRAIE FONCTION)
app.post('/api/vault/withdraw', async (req: Request, res: Response) => {
  try {
    const { vaultAddress, assetDecimals, userAddress, amount } = req.body;
    
    // Validation des paramètres
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse vault invalide'
      });
    }
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide'
      });
    }

    console.log(`💰 [REAL] Retrait du vault: ${amount} tokens pour ${userAddress}`);

    // Utiliser votre vraie fonction withdrawFromVault
    const browserProvider = createBrowserProvider();
    const result = await withdrawFromVault(
      browserProvider,
      signer,
      vaultAddress,
      parseInt(assetDecimals),
      userAddress,
      amount.toString()
    );
    
    console.log(`✅ Retrait réussi: ${result.txHash}`);
    
    res.json({
      success: true,
      message: `Retrait de ${amount} tokens réussi`,
      transactionHash: result.txHash,
      sharesUsed: result.sharesUsed,
      vaultAddress,
      amount,
      source: 'real_function',
      result
    });

  } catch (error: any) {
    console.error('❌ Erreur retrait vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du retrait'
    });
  }
});

// 🔄 Endpoint: Racheter des shares (VRAIE FONCTION)
app.post('/api/vault/redeem', async (req: Request, res: Response) => {
  try {
    const { vaultAddress, userAddress, shares } = req.body;
    
    // Validation des paramètres
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse vault invalide'
      });
    }
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }
    
    if (!shares || isNaN(parseFloat(shares))) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de shares invalide'
      });
    }

    console.log(`🔄 [REAL] Rachat de shares: ${shares} pour ${userAddress}`);

    // Utiliser votre vraie fonction redeemFromVault
    const browserProvider = createBrowserProvider();
    const result = await redeemFromVault(
      browserProvider,
      signer,
      vaultAddress,
      userAddress,
      shares.toString()
    );
    
    console.log(`✅ Rachat réussi: ${result.txHash}`);
    
    res.json({
      success: true,
      message: `Rachat de ${shares} shares réussi`,
      transactionHash: result.txHash,
      assetsReceived: result.assetsReceived,
      vaultAddress,
      shares,
      source: 'real_function',
      result
    });

  } catch (error: any) {
    console.error('❌ Erreur rachat vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du rachat'
    });
  }
});

// 📊 Endpoint de santé
app.get('/health', async (req: Request, res: Response) => {
  try {
    let providerStatus = 'disconnected';
    let networkInfo = null;
    
    if (provider) {
      try {
        networkInfo = await provider.getNetwork();
        providerStatus = 'connected';
      } catch (error) {
        providerStatus = 'error';
      }
    }
    
    res.json({ 
      status: 'ok',
      mode: 'real_functions_only',
      timestamp: new Date().toISOString(),
      provider: {
        status: providerStatus,
        network: networkInfo ? {
          name: networkInfo.name,
          chainId: Number(networkInfo.chainId)
        } : null
      },
      signer: signer ? await signer.getAddress() : null,
      services: [
        'vault-deposit (real)',
        'vault-withdraw (real)', 
        'vault-redeem (real)',
        'vault-info (real)',
        'vault-portfolio (real)',
        'vault-balances (real)'
      ],
      version: '3.0.0-real-functions'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Initialiser et démarrer le serveur
async function startServer() {
  try {
    await initializeProvider();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Backend Crypto API (VRAIES FONCTIONS) démarré !');
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log('');
      console.log('📋 Endpoints disponibles (toutes vraies fonctions):');
      console.log(`   POST /api/vault/deposit`);
      console.log(`   POST /api/vault/withdraw`);
      console.log(`   POST /api/vault/redeem`);
      console.log(`   GET  /api/vault/info/:vaultAddress`);
      console.log(`   GET  /api/vault/portfolio/:userAddress`);
      console.log(`   GET  /api/vault/balances/:userAddress/:vaultAddress`);
      console.log(`   GET  /health`);
      console.log('');
      console.log('✅ Toutes les fonctions sont vos vraies fonctions VaultInteractor');
      console.log('🔗 Prêt à recevoir des requêtes');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

startServer();

export default app;
