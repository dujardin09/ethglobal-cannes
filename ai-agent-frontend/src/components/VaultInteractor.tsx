import { ethers } from "ethers"

// Types
interface VaultInfo {
  vaultAddress: string
  assetAddress: string
  decimals: number
}

interface UserVaultPosition {
  vaultAddress: string
  vaultName?: string
  vaultSymbol?: string
  assetAddress: string
  assetSymbol?: string
  assetDecimals: number
  vaultDecimals: number
  firstDepositDate: string
  lastInteractionDate: string
  totalDeposited: string 
  currentShares: string 
  currentValue?: string 
}

// Stockage local des positions utilisateur
class VaultPositionManager {
  private static STORAGE_KEY = 'user_vault_positions'

  static getUserPositions(userAddress: string): UserVaultPosition[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const allPositions = JSON.parse(stored)
      return allPositions[userAddress.toLowerCase()] || []
    } catch (error) {
      console.error('Erreur lecture positions:', error)
      return []
    }
  }

  static saveUserPosition(userAddress: string, position: UserVaultPosition) {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const allPositions = stored ? JSON.parse(stored) : {}
      
      const userKey = userAddress.toLowerCase()
      if (!allPositions[userKey]) {
        allPositions[userKey] = []
      }

      // Vérifier si le vault existe déjà
      const existingIndex = allPositions[userKey].findIndex(
        (p: UserVaultPosition) => p.vaultAddress.toLowerCase() === position.vaultAddress.toLowerCase()
      )

      if (existingIndex >= 0) {
        // Mettre à jour la position existante
        allPositions[userKey][existingIndex] = {
          ...allPositions[userKey][existingIndex],
          ...position,
          lastInteractionDate: new Date().toISOString()
        }
      } else {
        // Ajouter nouvelle position
        allPositions[userKey].push({
          ...position,
          firstDepositDate: new Date().toISOString(),
          lastInteractionDate: new Date().toISOString()
        })
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPositions))
    } catch (error) {
      console.error('Erreur sauvegarde position:', error)
    }
  }

  static removeUserPosition(userAddress: string, vaultAddress: string) {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return

      const allPositions = JSON.parse(stored)
      const userKey = userAddress.toLowerCase()
      
      if (allPositions[userKey]) {
        allPositions[userKey] = allPositions[userKey].filter(
          (p: UserVaultPosition) => p.vaultAddress.toLowerCase() !== vaultAddress.toLowerCase()
        )
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPositions))
      }
    } catch (error) {
      console.error('Erreur suppression position:', error)
    }
  }
}

// Minimal ABI ERC-20 + ERC-4626
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
]

const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) external returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
  "function asset() external view returns (address)",
  "function totalAssets() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function previewDeposit(uint256 assets) external view returns (uint256)",
  "function previewWithdraw(uint256 assets) external view returns (uint256)",
  "function previewRedeem(uint256 shares) external view returns (uint256)",
  "function maxDeposit(address receiver) external view returns (uint256)",
  "function maxWithdraw(address owner) external view returns (uint256)",
  "function maxRedeem(address owner) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
]

// Fonction pour récupérer les informations d'un vault
export async function getVaultInfo(
  provider: ethers.BrowserProvider,
  vaultAddress: string
) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider)
  
  try {
    const [name, symbol, decimals, assetAddress, totalAssets, totalSupply] = await Promise.all([
      vault.name(),
      vault.symbol(),
      vault.decimals(),
      vault.asset(),
      vault.totalAssets(),
      vault.totalSupply()
    ])

    // Informations sur l'asset sous-jacent
    const asset = new ethers.Contract(assetAddress, ERC20_ABI, provider)
    const [assetName, assetSymbol, assetDecimals] = await Promise.all([
      asset.name(),
      asset.symbol(),
      asset.decimals()
    ])

    return {
      vault: {
        address: vaultAddress,
        name,
        symbol,
        decimals,
        totalAssets: ethers.formatUnits(totalAssets, assetDecimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        sharePrice: totalSupply > 0 ? Number(totalAssets) / Number(totalSupply) : 0
      },
      asset: {
        address: assetAddress,
        name: assetName,
        symbol: assetSymbol,
        decimals: assetDecimals
      }
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des infos vault:", error)
    throw error
  }
}

// Fonction pour récupérer toutes les positions actives de l'utilisateur
export async function getUserActiveVaults(
  provider: ethers.BrowserProvider,
  userAddress: string
): Promise<UserVaultPosition[]> {
  const savedPositions = VaultPositionManager.getUserPositions(userAddress)
  const activePositions: UserVaultPosition[] = []

  for (const position of savedPositions) {
    try {
      // Vérifier si l'utilisateur a encore des shares dans ce vault
      const vault = new ethers.Contract(position.vaultAddress, VAULT_ABI, provider)
      const currentShares = await vault.balanceOf(userAddress)
      
      if (currentShares > 0) {
        // Mettre à jour la position avec les valeurs actuelles
        const [vaultInfo, currentValue] = await Promise.all([
          getVaultInfo(provider, position.vaultAddress),
          vault.convertToAssets(currentShares)
        ])

        const updatedPosition: UserVaultPosition = {
          ...position,
          currentShares: ethers.formatUnits(currentShares, position.vaultDecimals),
          currentValue: ethers.formatUnits(currentValue, position.assetDecimals),
          vaultName: vaultInfo.vault.name,
          vaultSymbol: vaultInfo.vault.symbol,
          assetSymbol: vaultInfo.asset.symbol
        }

        activePositions.push(updatedPosition)
      } else {
        // Plus de shares, supprimer de la mémoire
        VaultPositionManager.removeUserPosition(userAddress, position.vaultAddress)
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification du vault ${position.vaultAddress}:`, error)
      // Garder la position même en cas d'erreur pour éviter de perdre les données
      activePositions.push(position)
    }
  }

  return activePositions
}

// Fonction pour afficher un résumé des positions utilisateur
export async function displayUserPortfolio(
  provider: ethers.BrowserProvider,
  userAddress: string
) {
  console.log("🏦 Récupération du portefeuille utilisateur...")
  
  const activeVaults = await getUserActiveVaults(provider, userAddress)
  
  if (activeVaults.length === 0) {
    console.log("📭 Aucune position active trouvée")
    return activeVaults
  }

  console.log(`\n💼 Portefeuille actif (${activeVaults.length} vault(s)):`)
  
  let totalValueUSD = 0
  
  for (let i = 0; i < activeVaults.length; i++) {
    const vault = activeVaults[i]
    console.log(`\n${i + 1}. ${vault.vaultSymbol || 'N/A'} (${vault.vaultAddress})`)
    console.log(`   Asset: ${vault.assetSymbol || 'N/A'}`)
    console.log(`   Shares détenues: ${vault.currentShares}`)
    console.log(`   Valeur actuelle: ${vault.currentValue || 'N/A'} ${vault.assetSymbol}`)
    console.log(`   Total déposé: ${vault.totalDeposited} ${vault.assetSymbol}`)
    console.log(`   Premier dépôt: ${new Date(vault.firstDepositDate).toLocaleDateString()}`)
    console.log(`   Dernière interaction: ${new Date(vault.lastInteractionDate).toLocaleDateString()}`)
    
    // Calculer le P&L si possible
    if (vault.currentValue && vault.totalDeposited) {
      const currentVal = parseFloat(vault.currentValue)
      const deposited = parseFloat(vault.totalDeposited)
      const pnl = currentVal - deposited
      const pnlPercent = (pnl / deposited) * 100
      
      console.log(`   P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} ${vault.assetSymbol} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`)
    }
  }

  return activeVaults
}
export async function getUserBalances(
  provider: ethers.BrowserProvider,
  userAddress: string,
  vaultAddress: string,
  assetAddress: string,
  assetDecimals: number,
  vaultDecimals: number
) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider)
  const asset = new ethers.Contract(assetAddress, ERC20_ABI, provider)

  const [assetBalance, vaultBalance] = await Promise.all([
    asset.balanceOf(userAddress),
    vault.balanceOf(userAddress)
  ])

  return {
    assetBalance: ethers.formatUnits(assetBalance, assetDecimals),
    vaultShares: ethers.formatUnits(vaultBalance, vaultDecimals),
    assetBalanceRaw: assetBalance,
    vaultSharesRaw: vaultBalance
  }
}

export async function depositToVault(
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
  vaultInfo: VaultInfo,
  userAddress: string,
  amountHuman: string
) {
  const { vaultAddress, assetAddress, decimals } = vaultInfo

  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer)
  const token = new ethers.Contract(assetAddress, ERC20_ABI, signer)

  const amount = ethers.parseUnits(amountHuman, decimals)

  try {
    // Récupérer les infos du vault pour la sauvegarde
    const vaultInfoComplete = await getVaultInfo(provider, vaultAddress)
    
    // Vérifications préalables
    const [userBalance, maxDeposit, previewShares] = await Promise.all([
      token.balanceOf(userAddress),
      vault.maxDeposit(userAddress),
      vault.previewDeposit(amount)
    ])

    // Vérifier si l'utilisateur a assez de tokens
    if (userBalance < amount) {
      throw new Error(`Solde insuffisant. Vous avez ${ethers.formatUnits(userBalance, decimals)} tokens`)
    }

    // Vérifier si le vault accepte ce montant
    if (maxDeposit < amount) {
      throw new Error(`Dépôt trop important. Maximum autorisé: ${ethers.formatUnits(maxDeposit, decimals)}`)
    }

    console.log(`Dépôt de ${amountHuman} tokens pour recevoir ~${ethers.formatUnits(previewShares, 18)} shares`)

    // Vérifier et approuver si nécessaire
    const allowance = await token.allowance(userAddress, vaultAddress)
    if (allowance < amount) {
      console.log("Approbation des tokens...")
      const approveTx = await token.approve(vaultAddress, amount)
      await approveTx.wait()
      console.log("Approbation confirmée")
    }

    // Effectuer le dépôt
    console.log("Dépôt en cours...")
    const depositTx = await vault.deposit(amount, userAddress)
    const receipt = await depositTx.wait()
    
    console.log("Dépôt confirmé:", receipt.transactionHash)

    // Sauvegarder la position en mémoire
    try {
      // Récupérer la position existante ou créer une nouvelle
      const existingPositions = VaultPositionManager.getUserPositions(userAddress)
      const existingPosition = existingPositions.find(
        p => p.vaultAddress.toLowerCase() === vaultAddress.toLowerCase()
      )

      // Calculer le nouveau total déposé
      const previousDeposited = existingPosition ? parseFloat(existingPosition.totalDeposited) : 0
      const newTotalDeposited = previousDeposited + parseFloat(amountHuman)

      const position: UserVaultPosition = {
        vaultAddress,
        vaultName: vaultInfoComplete.vault.name,
        vaultSymbol: vaultInfoComplete.vault.symbol,
        assetAddress,
        assetSymbol: vaultInfoComplete.asset.symbol,
        assetDecimals: decimals,
        vaultDecimals: vaultInfoComplete.vault.decimals,
        firstDepositDate: existingPosition?.firstDepositDate || new Date().toISOString(),
        lastInteractionDate: new Date().toISOString(),
        totalDeposited: newTotalDeposited.toString(),
        currentShares: "0" // Sera mis à jour lors de la prochaine lecture
      }

      VaultPositionManager.saveUserPosition(userAddress, position)
      console.log("✅ Position sauvegardée en mémoire")
    } catch (saveError) {
      console.warn("⚠️ Erreur sauvegarde position:", saveError)
    }
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      expectedShares: ethers.formatUnits(previewShares, 18)
    }

  } catch (error) {
    console.error("❌ Erreur lors du dépôt:", error)
    throw error
  }
}

// Fonction pour retirer des assets du vault
export async function withdrawFromVault(
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
  vaultAddress: string,
  assetDecimals: number,
  userAddress: string,
  amountHuman: string
) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer)
  const amount = ethers.parseUnits(amountHuman, assetDecimals)

  try {
    const [maxWithdraw, previewShares] = await Promise.all([
      vault.maxWithdraw(userAddress),
      vault.previewWithdraw(amount)
    ])

    if (maxWithdraw < amount) {
      throw new Error(`Retrait trop important. Maximum: ${ethers.formatUnits(maxWithdraw, assetDecimals)}`)
    }

    console.log(`Retrait de ${amountHuman} tokens (coûtera ~${ethers.formatUnits(previewShares, 18)} shares)`)

    const withdrawTx = await vault.withdraw(amount, userAddress, userAddress)
    const receipt = await withdrawTx.wait()
    
    console.log("Retrait confirmé:", receipt.transactionHash)
    return {
      success: true,
      txHash: receipt.transactionHash,
      sharesUsed: ethers.formatUnits(previewShares, 18)
    }

  } catch (error) {
    console.error("Erreur lors du retrait:", error)
    throw error
  }
}

// Fonction pour racheter des shares (redeem)
export async function redeemFromVault(
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
  vaultAddress: string,
  userAddress: string,
  sharesHuman: string
) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer)
  const shares = ethers.parseUnits(sharesHuman, 18) // Les shares sont généralement en 18 decimals

  try {
    const [maxRedeem, previewAssets] = await Promise.all([
      vault.maxRedeem(userAddress),
      vault.previewRedeem(shares)
    ])

    if (maxRedeem < shares) {
      throw new Error(`Rachat trop important. Maximum: ${ethers.formatUnits(maxRedeem, 18)} shares`)
    }

    console.log(`Rachat de ${sharesHuman} shares pour ~${ethers.formatUnits(previewAssets, 18)} tokens`)

    const redeemTx = await vault.redeem(shares, userAddress, userAddress)
    const receipt = await redeemTx.wait()
    
    console.log("Rachat confirmé:", receipt.transactionHash)
    return {
      success: true,
      txHash: receipt.transactionHash,
      assetsReceived: ethers.formatUnits(previewAssets, 18)
    }

  } catch (error) {
    console.error("Erreur lors du rachat:", error)
    throw error
  }
}
