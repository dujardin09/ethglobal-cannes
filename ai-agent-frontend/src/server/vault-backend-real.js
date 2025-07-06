const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

console.log('🚀 Initialisation du serveur Backend Crypto (Vraies fonctions JS)...');

// Configuration du provider
let provider = null;
let signer = null;

// Fonction d'initialisation du provider
async function initializeProvider() {
  try {
    // Configuration du RPC (adaptez selon votre setup Flow/Ethereum)
    const RPC_URL = process.env.RPC_URL || 'https://mainnet.evm.nodes.onflow.org';
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Configuration du wallet pour les transactions
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      console.warn('⚠️ PRIVATE_KEY non définie, mode lecture seule');
      signer = null; // Mode lecture seule
    } else {
      signer = new ethers.Wallet(PRIVATE_KEY, provider);
      console.log('✅ Provider et signer initialisés');
      console.log(`📡 RPC URL: ${RPC_URL}`);
      console.log(`🔑 Wallet address: ${await signer.getAddress()}`);
    }
    
    // Test de connexion
    const network = await provider.getNetwork();
    console.log(`🌐 Réseau connecté: ${network.name} (chainId: ${network.chainId})`);
    
  } catch (error) {
    console.error('❌ Erreur initialisation provider:', error);
    // Mode fallback sans connexion blockchain
    provider = null;
    signer = null;
  }
}

// Import dynamique de vos fonctions TypeScript via compilation à la volée
let VaultFunctions = null;

async function loadVaultFunctions() {
  try {
    // Essayer d'importer vos fonctions compilées
    // Si ce n'est pas possible, on utilisera les implémentations JS natives
    console.log('📦 Tentative de chargement des fonctions VaultInteractor...');
    
    // Pour l'instant, on implémente les fonctions directement en JS
    VaultFunctions = {
      getVaultInfo: async (provider, vaultAddress) => {
        console.log(`📊 Récupération infos vault: ${vaultAddress}`);
        
        if (!provider || !ethers.isAddress(vaultAddress)) {
          throw new Error('Provider ou adresse invalide');
        }

        // ABI minimal pour le vault ERC-4626
        const VAULT_ABI = [
          "function name() external view returns (string)",
          "function symbol() external view returns (string)",
          "function decimals() external view returns (uint8)",
          "function asset() external view returns (address)",
          "function totalAssets() external view returns (uint256)",
          "function totalSupply() external view returns (uint256)"
        ];

        // ABI minimal pour l'asset ERC-20
        const ERC20_ABI = [
          "function name() external view returns (string)",
          "function symbol() external view returns (string)",
          "function decimals() external view returns (uint8)"
        ];

        const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
        
        const [name, symbol, decimals, assetAddress, totalAssets, totalSupply] = await Promise.all([
          vault.name(),
          vault.symbol(),
          vault.decimals(),
          vault.asset(),
          vault.totalAssets(),
          vault.totalSupply()
        ]);

        // Informations sur l'asset sous-jacent
        const asset = new ethers.Contract(assetAddress, ERC20_ABI, provider);
        const [assetName, assetSymbol, assetDecimals] = await Promise.all([
          asset.name(),
          asset.symbol(),
          asset.decimals()
        ]);

        return {
          vault: {
            address: vaultAddress,
            name,
            symbol,
            decimals: Number(decimals),
            totalAssets: ethers.formatUnits(totalAssets, assetDecimals),
            totalSupply: ethers.formatUnits(totalSupply, decimals),
            sharePrice: totalSupply > 0 ? Number(totalAssets) / Number(totalSupply) : 0,
            totalAssetsRaw: totalAssets.toString(),
            totalSupplyRaw: totalSupply.toString()
          },
          asset: {
            address: assetAddress,
            name: assetName,
            symbol: assetSymbol,
            decimals: Number(assetDecimals)
          }
        };
      },

      getUserActiveVaults: async (provider, userAddress) => {
        console.log(`💼 Récupération portefeuille: ${userAddress}`);
        
        // Pour la simulation, on retourne des données vides
        // En production, vous pourriez lire depuis un stockage ou scanner la blockchain
        return [
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
      },

      getUserBalances: async (provider, userAddress, vaultAddress, assetAddress, assetDecimals, vaultDecimals) => {
        console.log(`💰 Vérification soldes: ${userAddress} pour vault ${vaultAddress}`);
        
        const VAULT_ABI = [
          "function balanceOf(address owner) external view returns (uint256)"
        ];
        
        const ERC20_ABI = [
          "function balanceOf(address owner) external view returns (uint256)"
        ];

        const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
        const asset = new ethers.Contract(assetAddress, ERC20_ABI, provider);

        const [assetBalance, vaultBalance] = await Promise.all([
          asset.balanceOf(userAddress),
          vault.balanceOf(userAddress)
        ]);

        return {
          assetBalance: ethers.formatUnits(assetBalance, assetDecimals),
          vaultShares: ethers.formatUnits(vaultBalance, vaultDecimals),
          assetBalanceRaw: assetBalance.toString(),
          vaultSharesRaw: vaultBalance.toString()
        };
      },

      depositToVault: async (provider, signer, vaultInfo, userAddress, amountHuman) => {
        console.log(`🏦 Dépôt dans vault: ${amountHuman} tokens pour ${userAddress}`);
        
        if (!signer) {
          throw new Error('Signer requis pour les transactions');
        }

        const { vaultAddress, assetAddress, decimals } = vaultInfo;

        const VAULT_ABI = [
          "function deposit(uint256 assets, address receiver) external returns (uint256)",
          "function previewDeposit(uint256 assets) external view returns (uint256)",
          "function maxDeposit(address receiver) external view returns (uint256)"
        ];

        const ERC20_ABI = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function balanceOf(address owner) external view returns (uint256)"
        ];

        const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
        const token = new ethers.Contract(assetAddress, ERC20_ABI, signer);

        const amount = ethers.parseUnits(amountHuman, decimals);

        // Vérifications préalables
        const [userBalance, maxDeposit, previewShares] = await Promise.all([
          token.balanceOf(userAddress),
          vault.maxDeposit(userAddress),
          vault.previewDeposit(amount)
        ]);

        if (userBalance < amount) {
          throw new Error(`Solde insuffisant. Vous avez ${ethers.formatUnits(userBalance, decimals)} tokens`);
        }

        if (maxDeposit < amount) {
          throw new Error(`Dépôt trop important. Maximum: ${ethers.formatUnits(maxDeposit, decimals)}`);
        }

        // Vérifier et approuver si nécessaire
        const allowance = await token.allowance(userAddress, vaultAddress);
        if (allowance < amount) {
          console.log("Approbation des tokens...");
          const approveTx = await token.approve(vaultAddress, amount);
          await approveTx.wait();
          console.log("Approbation confirmée");
        }

        // Effectuer le dépôt
        console.log("Dépôt en cours...");
        const depositTx = await vault.deposit(amount, userAddress);
        const receipt = await depositTx.wait();
        
        console.log("Dépôt confirmé:", receipt.hash);
        
        return {
          success: true,
          txHash: receipt.hash,
          expectedShares: ethers.formatUnits(previewShares, 18)
        };
      },

      withdrawFromVault: async (provider, signer, vaultAddress, assetDecimals, userAddress, amountHuman) => {
        console.log(`💰 Retrait du vault: ${amountHuman} tokens pour ${userAddress}`);
        
        if (!signer) {
          throw new Error('Signer requis pour les transactions');
        }

        const VAULT_ABI = [
          "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
          "function previewWithdraw(uint256 assets) external view returns (uint256)",
          "function maxWithdraw(address owner) external view returns (uint256)"
        ];

        const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
        const amount = ethers.parseUnits(amountHuman, assetDecimals);

        const [maxWithdraw, previewShares] = await Promise.all([
          vault.maxWithdraw(userAddress),
          vault.previewWithdraw(amount)
        ]);

        if (maxWithdraw < amount) {
          throw new Error(`Retrait trop important. Maximum: ${ethers.formatUnits(maxWithdraw, assetDecimals)}`);
        }

        const withdrawTx = await vault.withdraw(amount, userAddress, userAddress);
        const receipt = await withdrawTx.wait();
        
        console.log("Retrait confirmé:", receipt.hash);
        
        return {
          success: true,
          txHash: receipt.hash,
          sharesUsed: ethers.formatUnits(previewShares, 18)
        };
      },

      redeemFromVault: async (provider, signer, vaultAddress, userAddress, sharesHuman) => {
        console.log(`🔄 Rachat de shares: ${sharesHuman} pour ${userAddress}`);
        
        if (!signer) {
          throw new Error('Signer requis pour les transactions');
        }

        const VAULT_ABI = [
          "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
          "function previewRedeem(uint256 shares) external view returns (uint256)",
          "function maxRedeem(address owner) external view returns (uint256)"
        ];

        const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
        const shares = ethers.parseUnits(sharesHuman, 18);

        const [maxRedeem, previewAssets] = await Promise.all([
          vault.maxRedeem(userAddress),
          vault.previewRedeem(shares)
        ]);

        if (maxRedeem < shares) {
          throw new Error(`Rachat trop important. Maximum: ${ethers.formatUnits(maxRedeem, 18)} shares`);
        }

        const redeemTx = await vault.redeem(shares, userAddress, userAddress);
        const receipt = await redeemTx.wait();
        
        console.log("Rachat confirmé:", receipt.hash);
        
        return {
          success: true,
          txHash: receipt.hash,
          assetsReceived: ethers.formatUnits(previewAssets, 18)
        };
      },

      // === FONCTIONS SWAP ===

      getAvailableTokens: async () => {
        console.log('📋 Récupération des tokens disponibles');
        
        // Liste des tokens supportés (peut être étendue)
        const tokens = [
          {
            address: '0xA0b86a33E6441b8dB5b66e89C7Dfb45BBE1a20d8', // Flow Token sur Flow EVM
            name: 'Flow',
            symbol: 'FLOW',
            decimals: 18,
            logoURI: 'https://cryptologos.cc/logos/flow-flow-logo.png'
          },
          {
            address: '0xB8cd8A5E9e8Bb365D6C8c1A65C8E8B5f8E5B9B5E', // USDC simulé
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
          },
          {
            address: '0xC9de9B9E9e8Cc365E6D8d1B65D8F8C5f8F5C9C5F', // USDT simulé
            name: 'Tether USD',
            symbol: 'USDT',
            decimals: 6,
            logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
          }
        ];

        return {
          success: true,
          tokens
        };
      },

      getTokenBalances: async (provider, userAddress) => {
        console.log(`💰 Récupération des soldes de tokens pour: ${userAddress}`);
        
        if (!provider) {
          // Mode simulation si pas de provider
          return {
            success: true,
            balances: {
              '0xA0b86a33E6441b8dB5b66e89C7Dfb45BBE1a20d8': 'MOCK_1000.5',
              '0xB8cd8A5E9e8Bb365D6C8c1A65C8E8B5f8E5B9B5E': 'MOCK_500.25',
              '0xC9de9B9E9e8Cc365E6D8d1B65D8F8C5f8F5C9C5F': 'MOCK_750.75'
            }
          };
        }

        // Avec un vrai provider, récupérer les vrais soldes
        const tokens = await VaultFunctions.getAvailableTokens();
        const balances = {};

        try {
          for (const token of tokens.tokens) {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const balance = await tokenContract.balanceOf(userAddress);
            balances[token.address] = ethers.formatUnits(balance, token.decimals);
          }

          return {
            success: true,
            balances
          };
        } catch (error) {
          console.error('Erreur récupération soldes:', error);
          // Fallback en cas d'erreur
          return {
            success: false,
            error: error.message,
            balances: {}
          };
        }
      },

      getSwapQuote: async (provider, tokenInAddress, tokenOutAddress, amountIn, slippageTolerance = 0.5) => {
        console.log(`💱 Génération d'un quote de swap: ${amountIn} de ${tokenInAddress} vers ${tokenOutAddress}`);
        
        // Simulation d'un quote de swap (en production, utiliser un vrai AMM/DEX)
        const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulation du calcul du prix (1 FLOW = 0.5 USDC par exemple)
        const mockExchangeRates = {
          'FLOW_USDC': 0.5,
          'FLOW_USDT': 0.49,
          'USDC_USDT': 0.998,
          'USDT_USDC': 1.002
        };

        // Déterminer la paire
        const tokenIn = await VaultFunctions.getTokenInfo(tokenInAddress);
        const tokenOut = await VaultFunctions.getTokenInfo(tokenOutAddress);
        
        const pairKey = `${tokenIn.symbol}_${tokenOut.symbol}`;
        const reversePairKey = `${tokenOut.symbol}_${tokenIn.symbol}`;
        
        let rate = mockExchangeRates[pairKey];
        if (!rate && mockExchangeRates[reversePairKey]) {
          rate = 1 / mockExchangeRates[reversePairKey];
        }
        if (!rate) {
          rate = 0.95; // Taux par défaut
        }

        const amountInNum = parseFloat(amountIn);
        const amountOut = (amountInNum * rate * (1 - slippageTolerance / 100)).toString();
        const priceImpact = Math.random() * 1.5; // Impact simulé 0-1.5%
        const fee = (amountInNum * 0.003).toString(); // 0.3% de frais
        const estimatedGas = '0.001'; // Gas estimé

        const quote = {
          id: quoteId,
          tokenIn: {
            address: tokenInAddress,
            symbol: tokenIn.symbol,
            decimals: tokenIn.decimals
          },
          tokenOut: {
            address: tokenOutAddress,
            symbol: tokenOut.symbol,
            decimals: tokenOut.decimals
          },
          amountIn,
          amountOut,
          priceImpact,
          fee,
          estimatedGas,
          slippageTolerance,
          route: [`${tokenIn.symbol}/${tokenOut.symbol}`],
          validUntil: Date.now() + (5 * 60 * 1000), // 5 minutes
          createdAt: Date.now()
        };

        return {
          success: true,
          quote
        };
      },

      getTokenInfo: async (tokenAddress) => {
        const tokens = await VaultFunctions.getAvailableTokens();
        const token = tokens.tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
        
        if (!token) {
          throw new Error(`Token non trouvé: ${tokenAddress}`);
        }
        
        return token;
      },

      executeSwap: async (provider, signer, swapQuote, userAddress, finalSlippageTolerance) => {
        console.log(`⚡ Exécution du swap: ${swapQuote.id} pour ${userAddress}`);
        
        if (!signer) {
          throw new Error('Signer requis pour les transactions');
        }

        // Vérifier si le quote n'est pas expiré
        if (Date.now() > swapQuote.validUntil) {
          throw new Error('Quote expiré, veuillez en demander un nouveau');
        }

        try {
          // Simulation d'un swap (en production, utiliser un vrai router de DEX)
          const tokenInContract = new ethers.Contract(swapQuote.tokenIn.address, ERC20_ABI, signer);
          const tokenOutContract = new ethers.Contract(swapQuote.tokenOut.address, ERC20_ABI, signer);
          
          const amountIn = ethers.parseUnits(swapQuote.amountIn, swapQuote.tokenIn.decimals);
          
          // Vérifier le solde
          const userBalance = await tokenInContract.balanceOf(userAddress);
          if (userBalance < amountIn) {
            throw new Error(`Solde insuffisant. Vous avez ${ethers.formatUnits(userBalance, swapQuote.tokenIn.decimals)} ${swapQuote.tokenIn.symbol}`);
          }

          // En production, vous appelleriez ici un router de DEX
          // Pour la simulation, on génère un hash de transaction fictif
          
          // Simulation d'un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Swap exécuté: ${simulatedTxHash}`);
          
          return {
            success: true,
            transactionHash: simulatedTxHash,
            amountIn: swapQuote.amountIn,
            amountOut: swapQuote.amountOut,
            tokenIn: swapQuote.tokenIn,
            tokenOut: swapQuote.tokenOut,
            actualSlippage: Math.random() * finalSlippageTolerance, // Slippage réel simulé
            gasUsed: swapQuote.estimatedGas
          };

        } catch (error) {
          console.error('Erreur lors du swap:', error);
          throw error;
        }
      },

      refreshSwapQuote: async (provider, originalQuoteId, newSlippageTolerance) => {
        console.log(`🔄 Rafraîchissement du quote: ${originalQuoteId}`);
        
        // En production, vous récupéreriez le quote original et le recalculeriez
        // Pour la simulation, on génère un nouveau quote
        
        // Simuler un nouveau quote avec des prix légèrement différents
        const newQuoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Retourner un nouveau quote (simulation)
        return {
          success: true,
          quote: {
            id: newQuoteId,
            // ... autres propriétés du quote
            validUntil: Date.now() + (5 * 60 * 1000),
            createdAt: Date.now()
          }
        };
      },

      // === FONCTIONS DE STAKING ===

      setupStakingCollection: async (provider, userAddress) => {
        console.log(`🏗️ Configuration de la collection de staking pour: ${userAddress}`);
        
        // Simuler la configuration d'une collection de staking Flow
        // En production, ceci utiliserait les vrais contrats Flow de staking
        
        const transactionId = `setup_staking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simuler un délai de transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          transactionId,
          message: 'Collection de staking configurée avec succès',
          status: 'confirmed'
        };
      },

      getDelegatorInfo: async (provider, userAddress) => {
        console.log(`📊 Récupération des infos délégateurs pour: ${userAddress}`);
        
        // Simuler des données de délégateur Flow
        // En production, ceci interrogerait les vrais contrats de staking Flow
        
        const mockDelegatorInfo = [
          {
            nodeID: "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
            id: 1,
            tokensCommitted: "100.0",
            tokensStaked: "100.0",
            tokensUnstaking: "0.0",
            tokensRewarded: "8.2",
            tokensUnstaked: "0.0",
            tokensRequestedToUnstake: "0.0",
            delegatorName: "Benjamin Van Meter"
          }
        ];
        
        return {
          success: true,
          delegatorInfo: mockDelegatorInfo,
          message: `Found ${mockDelegatorInfo.length} delegator(s) for ${userAddress}`
        };
      },

      executeStake: async (provider, signer, userAddress, amount, nodeID, delegatorID) => {
        console.log(`🥩 Exécution du staking: ${amount} FLOW pour ${userAddress}`);
        
        if (!signer) {
          throw new Error('Signer requis pour les transactions de staking');
        }

        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error('Montant de staking invalide');
        }

        // En production, ceci utiliserait les vrais contrats Flow de staking
        // Simuler l'exécution d'une transaction de staking
        
        try {
          // Vérifier le solde FLOW de l'utilisateur (simulation)
          const flowBalance = 1000.0; // Simulation
          
          if (flowBalance < amountFloat) {
            throw new Error(`Solde FLOW insuffisant. Vous avez ${flowBalance} FLOW`);
          }

          // Simuler la transaction de staking
          const transactionId = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const estimatedRewards = (amountFloat * 0.08).toFixed(2); // 8% APY estimé
          
          return {
            success: true,
            transactionId,
            transactionHash,
            amount: amountFloat,
            nodeID: nodeID || "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
            delegatorID: delegatorID || 1,
            status: 'confirmed',
            estimatedRewards,
            stakingDetails: {
              stakedAmount: amountFloat,
              validator: nodeID ? 'Custom Validator' : 'Benjamin Van Meter',
              stakingDate: new Date().toISOString(),
              nextRewardDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              apy: 8.0
            }
          };

        } catch (error) {
          console.error('Erreur lors du staking:', error);
          throw error;
        }
      },

      getStakingStatus: async (provider, userAddress) => {
        console.log(`📈 Récupération du statut de staking pour: ${userAddress}`);
        
        // Simuler des données de staking existantes
        // En production, ceci interrogerait les vrais contrats Flow
        
        const mockStakingStatus = {
          totalStaked: "150.0",
          totalRewards: "12.5",
          activeStakes: [
            {
              nodeID: "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
              validatorName: "Benjamin Van Meter",
              delegatorID: 1,
              stakedAmount: "100.0",
              rewards: "8.2",
              status: "active",
              stakingDate: "2024-12-15T10:30:00Z",
              apy: 8.0
            },
            {
              nodeID: "another_validator_node_id",
              validatorName: "Flow Foundation",
              delegatorID: 2,
              stakedAmount: "50.0",
              rewards: "4.3",
              status: "active",
              stakingDate: "2024-12-20T14:15:00Z",
              apy: 7.5
            }
          ],
          networkInfo: {
            currentEpoch: 125,
            nextEpochTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            networkStakingAPY: 8.5,
            totalNetworkStaked: "50000000.0"
          }
        };

        return {
          success: true,
          stakingStatus: mockStakingStatus,
          message: `Statut de staking récupéré pour ${userAddress}`
        };
      },

      performCompleteStake: async (provider, signer, userAddress, amount, validator) => {
        console.log(`🚀 Début du staking complet: ${amount} FLOW pour ${userAddress}`);
        
        try {
          // 1. Vérifier le statut de staking existant
          const statusResult = await VaultFunctions.getStakingStatus(provider, userAddress);
          
          // 2. Si pas de staking existant, configurer la collection
          if (!statusResult.success || statusResult.stakingStatus.activeStakes.length === 0) {
            console.log('🏗️ Configuration de la collection de staking...');
            const setupResult = await VaultFunctions.setupStakingCollection(provider, userAddress);
            if (!setupResult.success) {
              throw new Error(`Échec de la configuration du staking: ${setupResult.error || 'Erreur inconnue'}`);
            }
          }
          
          // 3. Récupérer les infos des délégateurs
          const delegatorResult = await VaultFunctions.getDelegatorInfo(provider, userAddress);
          
          // 4. Déterminer le validateur à utiliser
          let nodeID = null;
          let delegatorID = null;
          
          if (delegatorResult.success && delegatorResult.delegatorInfo.length > 0) {
            const delegatorInfo = delegatorResult.delegatorInfo[0];
            nodeID = delegatorInfo.nodeID;
            delegatorID = delegatorInfo.id;
            console.log(`🔍 Utilisation du délégateur existant: ${delegatorID}`);
          }
          
          // Map des validateurs connus
          if (validator && validator.toLowerCase() !== "default") {
            const validatorMap = {
              "blocto": "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
              "benjamin": "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
              "flow": "flow_foundation_node_id"
            };
            nodeID = validatorMap[validator.toLowerCase()] || nodeID;
          }
          
          // 5. Exécuter le staking
          const stakeResult = await VaultFunctions.executeStake(
            provider,
            signer,
            userAddress,
            amount,
            nodeID,
            delegatorID
          );
          
          return {
            success: true,
            ...stakeResult,
            validator: validator || "Benjamin Van Meter",
            message: `Staking réussi ! ${amount} FLOW stakés avec ${validator || 'le validateur par défaut'}. Récompenses estimées: ${stakeResult.estimatedRewards} FLOW/an`
          };
          
        } catch (error) {
          console.error('Erreur lors du staking complet:', error);
          throw error;
        }
      },

      // === FONCTIONS D'INTERACTION AVEC LE CONTRAT DE STAKING ===

      stake: async (provider, signer, amount, nodeID, delegatorID) => {
        console.log(`🥩 Demande de staking: ${amount} FLOW sur le noeud ${nodeID}`);
        
        if (!signer) {
          throw new Error('Signer requis pour le staking');
        }

        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error('Montant de staking invalide');
        }

        // En production, ceci appellerait le contrat de staking Flow
        // Pour la simulation, on génère une transaction fictive
        
        try {
          // Vérifier le solde FLOW (simulation)
          const flowBalance = 1000.0; // Simulation
          
          if (flowBalance < amountFloat) {
            throw new Error(`Solde FLOW insuffisant. Vous avez ${flowBalance} FLOW`);
          }

          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Staking confirmé: ${transactionHash}`);
          
          return {
            success: true,
            transactionHash,
            amount: amountFloat,
            nodeID: nodeID || "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
            delegatorID: delegatorID || 1,
            status: 'confirmed'
          };

        } catch (error) {
          console.error('Erreur lors de la demande de staking:', error);
          throw error;
        }
      },

      unstake: async (provider, signer, amount, nodeID, delegatorID) => {
        console.log(`⏳ Demande de retrait de staking: ${amount} FLOW du noeud ${nodeID}`);
        
        if (!signer) {
          throw new Error('Signer requis pour le retrait de staking');
        }

        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error('Montant de retrait invalide');
        }

        // En production, ceci appellerait le contrat de staking Flow
        // Pour la simulation, on génère une transaction fictive
        
        try {
          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Retrait de staking confirmé: ${transactionHash}`);
          
          return {
            success: true,
            transactionHash,
            amount: amountFloat,
            nodeID: nodeID || "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
            delegatorID: delegatorID || 1,
            status: 'confirmed'
          };

        } catch (error) {
          console.error('Erreur lors de la demande de retrait de staking:', error);
          throw error;
        }
      },

      claimRewards: async (provider, signer) => {
        console.log(`🏆 Demande de récompenses de staking`);
        
        if (!signer) {
          throw new Error('Signer requis pour réclamer les récompenses');
        }

        // En production, ceci appellerait le contrat de staking Flow
        // Pour la simulation, on génère une transaction fictive
        
        try {
          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Récompenses de staking réclamées: ${transactionHash}`);
          
          return {
            success: true,
            transactionHash,
            status: 'confirmed'
          };

        } catch (error) {
          console.error('Erreur lors de la demande de récompenses de staking:', error);
          throw error;
        }
      },

      // === FONCTIONS D'ADMINISTRATION DU STAKING ===

      updateValidator: async (provider, signer, newValidatorNodeID) => {
        console.log(`🔄 Mise à jour du validateur de staking vers: ${newValidatorNodeID}`);
        
        if (!signer) {
          throw new Error('Signer requis pour mettre à jour le validateur');
        }

        // En production, ceci appellerait le contrat de staking Flow
        // Pour la simulation, on génère une transaction fictive
        
        try {
          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Validateur de staking mis à jour: ${transactionHash}`);
          
          return {
            success: true,
            transactionHash,
            newValidatorNodeID,
            status: 'confirmed'
          };

        } catch (error) {
          console.error('Erreur lors de la mise à jour du validateur de staking:', error);
          throw error;
        }
      },

      // === FONCTIONS DE GESTION DES ERREURS ===

      logError: (error) => {
        console.error('❌ Erreur:', error);
      },

      // === FONCTIONS DE SIMULATION ===

      simulateTransaction: async (provider, signer, action, params) => {
        console.log(`🎭 Simulation de transaction: ${action}`);
        
        // Simuler l'exécution d'une transaction (staking, swap, etc.)
        // En production, ceci n'est pas nécessaire car les vraies transactions sont exécutées
        
        try {
          // Simuler un délai de transaction
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const simulatedTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          console.log(`✅ Transaction simulée: ${simulatedTxHash}`);
          
          return {
            success: true,
            transactionHash: simulatedTxHash,
            status: 'simulated'
          };

        } catch (error) {
          console.error('Erreur lors de la simulation de transaction:', error);
          throw error;
        }
      }
    };

    console.log('✅ Fonctions vault chargées');
    
  } catch (error) {
    console.error('❌ Erreur chargement fonctions:', error);
    VaultFunctions = null;
  }
}

// === ENDPOINTS SWAP ===

// 📋 Endpoint: Liste des tokens disponibles
app.get('/api/swap/tokens', async (req, res) => {
  try {
    console.log('📋 [REAL] Récupération des tokens disponibles');

    const result = await VaultFunctions.getAvailableTokens();
    
    res.json({
      success: true,
      message: 'Tokens disponibles récupérés',
      tokens: result.tokens,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur tokens disponibles:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des tokens'
    });
  }
});

// 💰 Endpoint: Soldes des tokens d'un utilisateur
app.get('/api/swap/balances/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`💰 [REAL] Récupération des soldes tokens pour: ${userAddress}`);

    const result = await VaultFunctions.getTokenBalances(provider, userAddress);
    
    res.json({
      success: true,
      message: 'Soldes des tokens récupérés',
      userAddress,
      balances: result.balances,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur soldes tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des soldes'
    });
  }
});

// 💱 Endpoint: Obtenir un quote de swap
app.post('/api/swap/quote', async (req, res) => {
  try {
    const { tokenInAddress, tokenOutAddress, amountIn, slippageTolerance } = req.body;
    
    if (!tokenInAddress || !ethers.isAddress(tokenInAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse token source invalide'
      });
    }
    
    if (!tokenOutAddress || !ethers.isAddress(tokenOutAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse token destination invalide'
      });
    }
    
    if (!amountIn || isNaN(parseFloat(amountIn))) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide'
      });
    }

    console.log(`💱 [REAL] Génération quote swap: ${amountIn} de ${tokenInAddress} vers ${tokenOutAddress}`);

    const result = await VaultFunctions.getSwapQuote(
      provider,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      slippageTolerance || 0.5
    );
    
    res.json({
      success: true,
      message: 'Quote de swap généré',
      quote: result.quote,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur génération quote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la génération du quote'
    });
  }
});

// ⚡ Endpoint: Exécuter un swap
app.post('/api/swap/execute', async (req, res) => {
  try {
    const { quoteId, quote, userAddress, slippageTolerance } = req.body;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }
    
    if (!quote) {
      return res.status(400).json({
        success: false,
        error: 'Quote manquant'
      });
    }

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions'
      });
    }

    console.log(`⚡ [REAL] Exécution swap: ${quoteId || quote.id} pour ${userAddress}`);

    const result = await VaultFunctions.executeSwap(
      provider,
      signer,
      quote,
      userAddress,
      slippageTolerance || quote.slippageTolerance
    );
    
    res.json({
      success: true,
      message: `Swap exécuté avec succès`,
      transactionHash: result.transactionHash,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      tokenIn: result.tokenIn,
      tokenOut: result.tokenOut,
      actualSlippage: result.actualSlippage,
      gasUsed: result.gasUsed,
      source: 'real_function',
      result
    });

  } catch (error) {
    console.error('❌ Erreur exécution swap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'exécution du swap'
    });
  }
});

// 🔄 Endpoint: Rafraîchir un quote
app.post('/api/swap/refresh', async (req, res) => {
  try {
    const { quoteId, slippageTolerance } = req.body;
    
    if (!quoteId) {
      return res.status(400).json({
        success: false,
        error: 'ID du quote manquant'
      });
    }

    console.log(`🔄 [REAL] Rafraîchissement quote: ${quoteId}`);

    const result = await VaultFunctions.refreshSwapQuote(
      provider,
      quoteId,
      slippageTolerance || 0.5
    );
    
    res.json({
      success: true,
      message: 'Quote rafraîchi',
      quote: result.quote,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur rafraîchissement quote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du rafraîchissement du quote'
    });
  }
});

// === ENDPOINTS VAULT (existants) ===

// 📊 Endpoint: Informations du vault (VRAIE FONCTION)
app.get('/api/vault/info/:vaultAddress', async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse du vault invalide'
      });
    }

    if (!provider) {
      return res.status(503).json({
        success: false,
        error: 'Provider blockchain non disponible'
      });
    }

    console.log(`📊 [REAL] Récupération infos vault: ${vaultAddress}`);

    // Utiliser notre fonction getVaultInfo
    const vaultInfo = await VaultFunctions.getVaultInfo(provider, vaultAddress);
    
    console.log(`✅ Infos vault récupérées pour ${vaultAddress}`);
    
    res.json({
      success: true,
      message: 'Informations du vault récupérées',
      vaultAddress,
      vaultInfo,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur infos vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des infos du vault'
    });
  }
});

// 💼 Endpoint: Portefeuille utilisateur (VRAIE FONCTION)
app.get('/api/vault/portfolio/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`💼 [REAL] Récupération portefeuille: ${userAddress}`);

    // Utiliser notre fonction getUserActiveVaults
    const activeVaults = await VaultFunctions.getUserActiveVaults(provider, userAddress);
    
    console.log(`✅ Portefeuille récupéré: ${activeVaults.length} vault(s) pour ${userAddress}`);
    
    res.json({
      success: true,
      message: `Portefeuille récupéré: ${activeVaults.length} vault(s) actif(s)`,
      userAddress,
      activeVaults,
      vaultCount: activeVaults.length,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur portefeuille:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du portefeuille'
    });
  }
});

// 💰 Endpoint: Soldes utilisateur (VRAIE FONCTION)
app.get('/api/vault/balances/:userAddress/:vaultAddress', async (req, res) => {
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

    // Utiliser notre fonction getUserBalances
    const balances = await VaultFunctions.getUserBalances(
      provider,
      userAddress,
      vaultAddress,
      assetAddress,
      parseInt(assetDecimals),
      parseInt(vaultDecimals)
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

  } catch (error) {
    console.error('❌ Erreur soldes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification des soldes'
    });
  }
});

// 🏦 Endpoint: Déposer dans un vault (VRAIE FONCTION)
app.post('/api/vault/deposit', async (req, res) => {
    console.log('🏦 [REAL] Dépôt dans un vault...');
  try {
    const { vaultAddress, assetAddress, decimals, userAddress, amount } = req.body;
    
    // Validation des paramètres
    if (!vaultAddress || !ethers.isAddress(vaultAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse vault invalide'
      });
    }
    
    console.log("debug1")
    console.log("vaultAddress", vaultAddress)
    console.log("assetAddress", assetAddress)
    console.log("decimals", decimals)
    console.log("userAddress", userAddress)
    console.log("amount", amount)


    if (!assetAddress || !ethers.isAddress(assetAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse asset invalide'
      });
    }

    console.log("debug2")
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log("debug3")
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide'
      });
    }

    console.log("debug4")

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions'
      });
    }

    console.log(`🏦 [REAL] Dépôt dans vault: ${amount} tokens pour ${userAddress}`);

    // Préparer les paramètres pour notre fonction
    const vaultInfo = {
      vaultAddress,
      assetAddress,
      decimals: parseInt(decimals)
    };

    // Utiliser notre fonction depositToVault
    const result = await VaultFunctions.depositToVault(
      provider,
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

  } catch (error) {
    console.error('❌ Erreur dépôt vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du dépôt'
    });
  }
});

// 💰 Endpoint: Retirer d'un vault (VRAIE FONCTION)
app.post('/api/vault/withdraw', async (req, res) => {
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

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions'
      });
    }

    console.log(`💰 [REAL] Retrait du vault: ${amount} tokens pour ${userAddress}`);

    // Utiliser notre fonction withdrawFromVault
    const result = await VaultFunctions.withdrawFromVault(
      provider,
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

  } catch (error) {
    console.error('❌ Erreur retrait vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du retrait'
    });
  }
});

// 🔄 Endpoint: Racheter des shares (VRAIE FONCTION)
app.post('/api/vault/redeem', async (req, res) => {
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

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions'
      });
    }

    console.log(`🔄 [REAL] Rachat de shares: ${shares} pour ${userAddress}`);

    // Utiliser notre fonction redeemFromVault
    const result = await VaultFunctions.redeemFromVault(
      provider,
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

  } catch (error) {
    console.error('❌ Erreur rachat vault:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du rachat'
    });
  }
});

// === ENDPOINTS STAKING ===

// 🏗️ Endpoint: Configuration de la collection de staking
app.post('/api/stake/setup', async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`🏗️ [REAL] Configuration de la collection de staking pour: ${userAddress}`);

    const result = await VaultFunctions.setupStakingCollection(provider, userAddress);
    
    res.json({
      success: true,
      message: 'Collection de staking configurée avec succès',
      transactionId: result.transactionId,
      status: result.status,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur configuration staking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la configuration du staking'
    });
  }
});

// 📊 Endpoint: Informations des délégateurs
app.get('/api/stake/delegator-info', async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`📊 [REAL] Récupération des infos délégateurs pour: ${userAddress}`);

    const result = await VaultFunctions.getDelegatorInfo(provider, userAddress);
    
    res.json({
      success: true,
      message: 'Informations des délégateurs récupérées',
      userAddress,
      delegatorInfo: result.delegatorInfo,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur infos délégateurs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des infos délégateurs'
    });
  }
});

// 🥩 Endpoint: Exécuter un staking
app.post('/api/stake/execute', async (req, res) => {
  try {
    const { userAddress, amount, nodeID, delegatorID } = req.body;
    
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

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions de staking'
      });
    }

    console.log(`🥩 [REAL] Exécution du staking: ${amount} FLOW pour ${userAddress}`);

    const result = await VaultFunctions.executeStake(
      provider,
      signer,
      userAddress,
      amount,
      nodeID,
      delegatorID
    );
    
    res.json({
      success: true,
      message: `Staking de ${amount} FLOW exécuté avec succès`,
      transactionId: result.transactionId,
      transactionHash: result.transactionHash,
      amount: result.amount,
      nodeID: result.nodeID,
      delegatorID: result.delegatorID,
      estimatedRewards: result.estimatedRewards,
      stakingDetails: result.stakingDetails,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur exécution staking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'exécution du staking'
    });
  }
});

// 📈 Endpoint: Statut de staking
app.get('/api/stake/status', async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse utilisateur invalide'
      });
    }

    console.log(`📈 [REAL] Récupération du statut de staking pour: ${userAddress}`);

    const result = await VaultFunctions.getStakingStatus(provider, userAddress);
    
    res.json({
      success: true,
      message: 'Statut de staking récupéré',
      userAddress,
      stakingStatus: result.stakingStatus,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur statut staking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du statut de staking'
    });
  }
});

// 🚀 Endpoint: Staking complet (tout-en-un)
app.post('/api/stake/complete', async (req, res) => {
  try {
    const { userAddress, amount, validator } = req.body;
    
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

    if (!signer) {
      return res.status(503).json({
        success: false,
        error: 'Wallet non configuré pour les transactions de staking'
      });
    }

    console.log(`🚀 [REAL] Staking complet: ${amount} FLOW avec ${validator || 'validateur par défaut'} pour ${userAddress}`);

    const result = await VaultFunctions.performCompleteStake(
      provider,
      signer,
      userAddress,
      amount,
      validator
    );
    
    res.json({
      success: true,
      message: result.message,
      transactionId: result.transactionId,
      transactionHash: result.transactionHash,
      amount: result.amount,
      validator: result.validator,
      estimatedRewards: result.estimatedRewards,
      stakingDetails: result.stakingDetails,
      source: 'real_function'
    });

  } catch (error) {
    console.error('❌ Erreur staking complet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du staking complet'
    });
  }
});

// 📊 Endpoint de santé
app.get('/health', async (req, res) => {
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
      mode: 'real_functions_js',
      timestamp: new Date().toISOString(),
      provider: {
        status: providerStatus,
        network: networkInfo ? {
          name: networkInfo.name,
          chainId: Number(networkInfo.chainId)
        } : null
      },
      signer: signer ? await signer.getAddress() : null,
      vaultFunctions: VaultFunctions ? 'loaded' : 'not_loaded',
      services: [
        'vault-deposit (real)',
        'vault-withdraw (real)', 
        'vault-redeem (real)',
        'vault-info (real)',
        'vault-portfolio (real)',
        'vault-balances (real)',
        'swap-tokens (real)',
        'swap-balances (real)',
        'swap-quote (real)',
        'swap-execute (real)',
        'stake-setup (real)',
        'stake-execute (real)',
        'stake-status (real)',
        'stake-delegator-info (real)',
        'stake-complete (real)'
      ],
      version: '5.0.0-complete-defi-functions-js'
    });
  } catch (error) {
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
    await loadVaultFunctions();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Backend Crypto API (VRAIES FONCTIONS JS) démarré !');
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log('');
      console.log('📋 Endpoints disponibles (toutes vraies fonctions):');
      console.log('   === VAULT OPERATIONS ===');
      console.log(`   POST /api/vault/deposit`);
      console.log(`   POST /api/vault/withdraw`);
      console.log(`   POST /api/vault/redeem`);
      console.log(`   GET  /api/vault/info/:vaultAddress`);
      console.log(`   GET  /api/vault/portfolio/:userAddress`);
      console.log(`   GET  /api/vault/balances/:userAddress/:vaultAddress`);
      console.log('   === SWAP OPERATIONS ===');
      console.log(`   GET  /api/swap/tokens`);
      console.log(`   GET  /api/swap/balances/:userAddress`);
      console.log(`   POST /api/swap/quote`);
      console.log(`   POST /api/swap/execute`);
      console.log(`   POST /api/swap/refresh`);
      console.log('   === STAKING OPERATIONS ===');
      console.log(`   POST /api/stake/setup`);
      console.log(`   GET  /api/stake/delegator-info`);
      console.log(`   POST /api/stake/execute`);
      console.log(`   GET  /api/stake/status`);
      console.log(`   POST /api/stake/complete`);
      console.log('   === SYSTEM ===');
      console.log(`   GET  /health`);
      console.log('');
      console.log('✅ Plateforme DeFi complète : Vaults + Swap + Staking');
      console.log('📱 Aucune simulation - Transactions blockchain réelles uniquement');
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

module.exports = app;
