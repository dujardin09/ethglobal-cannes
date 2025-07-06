# VaultInteractor - AI Agent Usage Guide

This guide explains how to use the `VaultInteractor.tsx` module to interact with ERC-4626 vaults programmatically via an AI agent.

## 📚 Overview

The `VaultInteractor` provides a complete interface for:
- Discovering and analyzing ERC-4626 vaults
- Performing deposits and withdrawals
- Automatically tracking user positions
- Calculating performance (P&L)

## 🔧 Initial Setup

```tsx
import { ethers } from "ethers"
import {
  getVaultInfo,
  getUserActiveVaults,
  displayUserPortfolio,
  depositToVault,
  withdrawFromVault,
  redeemFromVault,
  getUserBalances
} from "./components/VaultInteractor"

// Provider configuration
const provider = new ethers.BrowserProvider(window.ethereum)
const signer = await provider.getSigner()
const userAddress = await signer.getAddress()
```

## 🎯 Main Functions

### 1. Analyze a vault

```tsx
// Retrieve all vault information
const vaultInfo = await getVaultInfo(provider, "0x...vaultAddress")

console.log(vaultInfo)
// Returns:
// {
//   vault: {
//     address: "0x...",
//     name: "Vault Name",
//     symbol: "VAULT",
//     decimals: 18,
//     totalAssets: "1000000.0", // Formatted TVL
//     totalSupply: "950000.0",  // Total shares
//     sharePrice: 1.0526        // Price per share
//   },
//   asset: {
//     address: "0x...",
//     name: "USD Coin",
//     symbol: "USDC",
//     decimals: 6
//   }
// }
```

### 2. Check user balances

```tsx
const balances = await getUserBalances(
  provider,
  userAddress,
  "0x...vaultAddress",
  "0x...assetAddress",
  6,  // asset decimals
  18  // vault decimals
)

console.log(balances)
// Returns:
// {
//   assetBalance: "1000.0",     // Available tokens
//   vaultShares: "500.0",       // Held shares
//   assetBalanceRaw: BigNumber, // Raw values
//   vaultSharesRaw: BigNumber
// }
```

### 3. Invest in a vault

```tsx
const vaultInfo = {
  vaultAddress: "0x...vault",
  assetAddress: "0x...asset", 
  decimals: 6 // asset decimals
}

const result = await depositToVault(
  provider,
  signer,
  vaultInfo,
  userAddress,
  "100.0" // Amount to deposit (human format)
)

console.log(result)
// Returns:
// {
//   success: true,
//   txHash: "0x...transaction",
//   expectedShares: "95.24" // Expected shares
// }

// ✅ Position is automatically saved in memory!
```

### 4. Withdraw funds

#### Option A: Withdraw a specific amount of assets

```tsx
const result = await withdrawFromVault(
  provider,
  signer,
  "0x...vaultAddress",
  6,           // asset decimals
  userAddress,
  "50.0"       // Amount to withdraw
)

console.log(result)
// Returns:
// {
//   success: true,
//   txHash: "0x...transaction",
//   sharesUsed: "47.62" // Shares used
// }
```

#### Option B: Redeem a specific number of shares

```tsx
const result = await redeemFromVault(
  provider,
  signer,
  "0x...vaultAddress",
  userAddress,
  "100.0" // Number of shares to redeem
)

console.log(result)
// Returns:
// {
//   success: true,
//   txHash: "0x...transaction", 
//   assetsReceived: "105.26" // Assets received
// }
```

### 5. View portfolio

#### Complete console display

```tsx
// Display detailed summary in console
const portfolio = await displayUserPortfolio(provider, userAddress)

// Console output:
// 🏦 Retrieving user portfolio...
// 
// 💼 Active portfolio (2 vault(s)):
// 
// 1. yUSDC (0x...vault1)
//    Asset: USDC
//    Shares held: 500.0
//    Current value: 526.32 USDC
//    Total deposited: 500.0 USDC
//    First deposit: 07/05/2025
//    Last interaction: 07/05/2025
//    P&L: +26.32 USDC (+5.26%)
```

#### Programmatic retrieval

```tsx
// Retrieve data for processing
const activeVaults = await getUserActiveVaults(provider, userAddress)

activeVaults.forEach((vault, index) => {
  console.log(`Vault ${index + 1}:`)
  console.log(`- Address: ${vault.vaultAddress}`)
  console.log(`- Name: ${vault.vaultSymbol}`)
  console.log(`- Asset: ${vault.assetSymbol}`)
  console.log(`- Value: ${vault.currentValue}`)
  console.log(`- Deposited: ${vault.totalDeposited}`)
  
  // Calculate P&L
  if (vault.currentValue && vault.totalDeposited) {
    const pnl = parseFloat(vault.currentValue) - parseFloat(vault.totalDeposited)
    const pnlPercent = (pnl / parseFloat(vault.totalDeposited)) * 100
    console.log(`- P&L: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)
  }
})
```

## 🤖 AI Agent Patterns

### Pattern 1: Vault analysis before investment

```tsx
async function analyzeVaultForInvestment(vaultAddress: string) {
  try {
    // 1. Retrieve vault information
    const info = await getVaultInfo(provider, vaultAddress)
    
    // 2. Check liquidity and metrics
    const tvl = parseFloat(info.vault.totalAssets)
    const sharePrice = info.vault.sharePrice
    
    // 3. Evaluate if it's a good investment
    const recommendation = {
      vault: info.vault.symbol,
      asset: info.asset.symbol,
      tvl: tvl,
      sharePrice: sharePrice,
      isRecommended: tvl > 100000 && sharePrice > 0.95, // Example criteria
      reason: tvl > 100000 ? "Sufficient TVL" : "TVL too low"
    }
    
    return recommendation
  } catch (error) {
    return { error: error.message }
  }
}
```

### Pattern 2: Automatic rebalancing

```tsx
async function rebalancePortfolio() {
  // 1. Retrieve current portfolio
  const portfolio = await getUserActiveVaults(provider, userAddress)
  
  // 2. Analyze performances
  const performances = portfolio.map(vault => {
    const pnl = parseFloat(vault.currentValue || "0") - parseFloat(vault.totalDeposited)
    const pnlPercent = (pnl / parseFloat(vault.totalDeposited)) * 100
    
    return {
      vaultAddress: vault.vaultAddress,
      symbol: vault.vaultSymbol,
      pnlPercent: pnlPercent,
      currentValue: parseFloat(vault.currentValue || "0")
    }
  })
  
  // 3. Decide on actions
  for (const perf of performances) {
    if (perf.pnlPercent < -10) {
      console.log(`⚠️ ${perf.symbol} losing ${perf.pnlPercent.toFixed(2)}%`)
      // Stop-loss logic
    } else if (perf.pnlPercent > 20) {
      console.log(`🎯 ${perf.symbol} gaining ${perf.pnlPercent.toFixed(2)}%`)
      // Profit-taking logic
    }
  }
}
```

### Pattern 3: Continuous monitoring

```tsx
async function monitorVaults() {
  const portfolio = await getUserActiveVaults(provider, userAddress)
  
  const alerts = []
  
  for (const vault of portfolio) {
    try {
      // Check current metrics
      const currentInfo = await getVaultInfo(provider, vault.vaultAddress)
      const currentShares = await getUserBalances(
        provider, userAddress, vault.vaultAddress, 
        vault.assetAddress, vault.assetDecimals, vault.vaultDecimals
      )
      
      // Detect significant changes
      const oldValue = parseFloat(vault.currentValue || "0")
      const newValue = parseFloat(currentShares.vaultShares) * currentInfo.vault.sharePrice
      const change = ((newValue - oldValue) / oldValue) * 100
      
      if (Math.abs(change) > 5) {
        alerts.push({
          vault: vault.vaultSymbol,
          change: change.toFixed(2),
          newValue: newValue.toFixed(2)
        })
      }
    } catch (error) {
      alerts.push({
        vault: vault.vaultSymbol,
        error: error.message
      })
    }
  }
  
  return alerts
}
```

## 🚨 Error Handling

All functions can throw errors. Here are the main ones:

```tsx
try {
  await depositToVault(provider, signer, vaultInfo, userAddress, "1000")
} catch (error) {
  if (error.message.includes("Insufficient balance")) {
    console.log("❌ Not enough tokens")
  } else if (error.message.includes("Deposit too large")) {
    console.log("❌ Amount exceeds vault limit")
  } else if (error.message.includes("User rejected")) {
    console.log("❌ Transaction cancelled by user")
  } else {
    console.log("❌ Technical error:", error.message)
  }
}
```

## 💾 Data Persistence

The system automatically saves:
- ✅ Each new vault where you invest
- ✅ Total amount deposited per vault  
- ✅ First deposit and last interaction dates
- ✅ Automatic removal when balance = 0

Data is stored in `localStorage` and persists between sessions.

## 🔄 Integration with scan_vault.py

You can use vaults discovered by your Python script:

```tsx
// Import Python scan results
import vaultScanResults from './erc4626_vaults_scan_20250705_143022.json'

// Analyze each discovered vault
for (const vaultData of vaultScanResults.vaults) {
  const analysis = await analyzeVaultForInvestment(vaultData.address)
  console.log(`Vault ${vaultData.symbol}:`, analysis)
}
```

## 📊 Available Metrics

- **TVL**: Total value locked in the vault
- **Share Price**: Current price of one share (assets/shares)
- **P&L**: Performance of your investment
- **APY**: Can be calculated by comparing values over time
- **Liquidity Ratio**: totalSupply vs totalAssets

## 🔥 Quick Start Example

Here's a complete example of how an AI agent could use these functions:

```tsx
// 1. Discover and analyze vaults from Python scan
import vaultScanResults from './erc4626_vaults_scan_20250705.json'

// 2. Initialize provider
const provider = new ethers.BrowserProvider(window.ethereum)
const signer = await provider.getSigner()
const userAddress = await signer.getAddress()

// 3. Analyze each vault and invest in the best ones
for (const vault of vaultScanResults.vaults) {
  const analysis = await analyzeVaultForInvestment(vault.address)
  
  if (analysis.isRecommended) {
    console.log(`✅ Investing in ${analysis.vault}`)
    
    const vaultInfo = {
      vaultAddress: vault.address,
      assetAddress: vault.asset,
      decimals: vault.asset_decimals
    }
    
    try {
      await depositToVault(provider, signer, vaultInfo, userAddress, "100")
      console.log(`🎯 Successfully invested in ${analysis.vault}`)
    } catch (error) {
      console.log(`❌ Failed to invest in ${analysis.vault}:`, error.message)
    }
  }
}

// 4. Monitor portfolio regularly
setInterval(async () => {
  const alerts = await monitorVaults()
  if (alerts.length > 0) {
    console.log("📢 Portfolio alerts:", alerts)
  }
}, 60000) // Check every minute

// 5. Display current portfolio
await displayUserPortfolio(provider, userAddress)
```

This guide gives you all the tools needed to create a sophisticated AI agent capable of automatically managing an ERC-4626 vault portfolio!
