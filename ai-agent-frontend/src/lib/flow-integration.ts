/**
 * Flow Blockchain Integration Utilities
 * Real Flow integration patterns inspired by FRW Extension
 */

import * as fcl from '@onflow/fcl';

// Cache for network connectivity to avoid excessive checks
let networkConnectivityCache: { 
  isConnected: boolean; 
  lastCheck: number; 
  cacheValidFor: number; 
} = {
  isConnected: false,
  lastCheck: 0,
  cacheValidFor: 30000 // Cache for 30 seconds
};

// Cache for FCL configuration to avoid excessive re-configuration
let fclConfigured = false;

// Configure FCL for server-side usage
const configureServerFCL = () => {
  const accessNodeUrl = process.env.NEXT_PUBLIC_ACCESS_NODE_URL || 'http://localhost:8888';
  
  // Only configure once or if needed
  if (!fclConfigured) {
    fcl.config({
      'accessNode.api': accessNodeUrl,
    });
    
    console.log(`FCL configured with access node: ${accessNodeUrl}`);
    fclConfigured = true;
  }
  
  return accessNodeUrl;
};

// Check if Flow emulator/network is accessible
const checkFlowNetworkConnectivity = async (): Promise<boolean> => {
  // Check cache first
  const now = Date.now();
  if (networkConnectivityCache.isConnected && (now - networkConnectivityCache.lastCheck) < networkConnectivityCache.cacheValidFor) {
    console.log('Using cached network connectivity status');
    return networkConnectivityCache.isConnected;
  }
  
  try {
    // Configure FCL and get the access node URL
    const accessNodeUrl = configureServerFCL();
    
    // Try a simple Flow query instead of HTTP check since emulator returns 404 on root
    try {
      await fcl.query({
        cadence: `access(all) fun main(): String { return "connected" }`,
        args: () => [],
      });
      
      console.log('Flow network connectivity verified');
      networkConnectivityCache = { isConnected: true, lastCheck: now, cacheValidFor: 30000 };
      return true;
    } catch (queryError) {
      console.warn('Flow query failed:', queryError);
      networkConnectivityCache = { isConnected: false, lastCheck: now, cacheValidFor: 30000 };
      return false;
    }
  } catch (error) {
    console.warn('Flow network connectivity check failed:', error);
    networkConnectivityCache = { isConnected: false, lastCheck: now, cacheValidFor: 30000 };
    return false;
  }
};

// Network-specific contract addresses
const NETWORK_CONTRACTS = {
  emulator: {
    FungibleToken: '0xee82856bf20e2aa6',        // From Flow emulator output
    FlowToken: '0x0ae53cb6e3f42a79',            // From Flow emulator output
    FUSD: '0xf233dcee88fe0abe',                 // Mock for now
    // Example DEX contracts (these would be real contracts in production)
    IncrementFi: '0x1000000000000001',
    BloctoSwap: '0x1000000000000002',
  },
  testnet: {
    FungibleToken: '0x9a0766d93b6608b7',
    FlowToken: '0x7e60df042a9c0868',
    FUSD: '0xe223d8a629e49c68',
    USDC: '0xa983fecbed621163',
    IncrementFi: '0xfcb06a5ae5b21b2e',
    BloctoSwap: '0xe0a0d81d17dd7185',
  },
  mainnet: {
    FungibleToken: '0xf233dcee88fe0abe',
    FlowToken: '0x1654653399040a61',
    FUSD: '0x3c5959b568896393',
    USDC: '0xa983fecbed621163',
    IncrementFi: '0xfcb06a5ae5b21b2e',
    BloctoSwap: '0x0000000000000000', // Replace with actual address
  }
};

// Real Cadence scripts for Flow blockchain integration (FRW-inspired)
export const FLOW_SCRIPTS = {
  // Get FLOW token balance (FRW pattern)
  GET_FLOW_BALANCE: `
    import FungibleToken from {{FungibleToken}}
    import FlowToken from {{FlowToken}}

    access(all) fun main(address: Address): UFix64 {
      let account = getAccount(address)
      
      if let vaultRef = account.capabilities
        .get<&FlowToken.Vault>(/public/flowTokenBalance)
        .borrow() {
        return vaultRef.balance
      }
      
      return 0.0
    }
  `,

  // Get generic fungible token balance (FRW pattern)
  GET_TOKEN_BALANCE: `
    import FungibleToken from {{FungibleToken}}

    access(all) fun main(address: Address, balancePath: PublicPath): UFix64 {
      let account = getAccount(address)
      
      if let vaultRef = account.capabilities
        .get<&{FungibleToken.Balance}>(balancePath)
        .borrow() {
        return vaultRef.balance
      }
      
      return 0.0
    }
  `,

  // Get multiple token balances at once (optimized for UI)
  GET_MULTIPLE_BALANCES: `
    import FungibleToken from {{FungibleToken}}
    import FlowToken from {{FlowToken}}

    access(all) fun main(address: Address): {String: UFix64} {
      let account = getAccount(address)
      let balances: {String: UFix64} = {}
      
      // FLOW balance
      if let flowVaultRef = account.capabilities
        .get<&FlowToken.Vault>(/public/flowTokenBalance)
        .borrow() {
        balances["FLOW"] = flowVaultRef.balance
      } else {
        balances["FLOW"] = 0.0
      }
      
      // FUSD balance (if available)
      if let fusdVaultRef = account.capabilities
        .get<&{FungibleToken.Balance}>(/public/fusdBalance)
        .borrow() {
        balances["FUSD"] = fusdVaultRef.balance
      } else {
        balances["FUSD"] = 0.0
      }
      
      // USDC balance (mock for now - would need real contract address)
      balances["USDC"] = 0.0
      
      // USDT balance (mock for now - would need real contract address)
      balances["USDT"] = 0.0
      
      return balances
    }
  `,

  // Get storage info (useful for fee estimation) - FRW pattern
  GET_STORAGE_INFO: `
    access(all) fun main(address: Address): {String: UFix64} {
      let account = getAccount(address)
      
      let storageUsed = account.storage.used
      let storageCapacity = account.storage.capacity
      
      return {
        "used": UFix64(storageUsed),
        "capacity": UFix64(storageCapacity),
        "available": UFix64(storageCapacity - storageUsed)
      }
    }
  `,

  // Get account minimum Flow balance (FRW pattern)
  GET_ACCOUNT_MIN_FLOW: `
    import FlowToken from {{FlowToken}}
    import FungibleToken from {{FungibleToken}}

    access(all) fun main(address: Address): UFix64 {
      let account = getAccount(address)
      
      let storageUsed = account.storage.used
      let storageCapacity = account.storage.capacity
      
      // Calculate minimum balance needed for storage
      let minBalance = UFix64(storageUsed) * 0.00001 // 1 FLOW per 100KB
      
      return minBalance
    }
  `,

  // Mock DEX quote script (replace with real DEX when available)
  GET_SWAP_QUOTE: `
    access(all) fun main(
      tokenInSymbol: String,
      tokenOutSymbol: String, 
      amountIn: UFix64
    ): {String: AnyStruct} {
      // Mock swap quote calculation
      // In production, this would query actual DEX contracts like Increment or BloctoSwap
      
      let priceRates: {String: UFix64} = {
        "FLOW": 0.5,  // 1 FLOW = 0.5 USD
        "USDC": 1.0,  // 1 USDC = 1.0 USD
        "FUSD": 1.0   // 1 FUSD = 1.0 USD
      }
      
      let priceIn = priceRates[tokenInSymbol] ?? 1.0
      let priceOut = priceRates[tokenOutSymbol] ?? 1.0
      
      let amountOut = amountIn * priceIn / priceOut
      let fee = amountIn * 0.003 // 0.3% fee
      
      return {
        "amountOut": amountOut - fee,
        "fee": fee,
        "priceImpact": 0.1,
        "route": ["direct"]
      }
    }
  `
};

// Real Flow transactions
export const FLOW_TRANSACTIONS = {
  // Transfer FLOW tokens
  TRANSFER_FLOW: `
    import FungibleToken from 0x9a0766d93b6608b7
    import FlowToken from 0x7e60df042a9c0868

    transaction(amount: UFix64, recipient: Address) {
      let sentVault: @{FungibleToken.Vault}
      
      prepare(signer: auth(BorrowValue) &Account) {
        let vaultRef = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
          ?? panic("Could not borrow reference to the owner's Vault!")
        
        self.sentVault <- vaultRef.withdraw(amount: amount)
      }
      
      execute {
        let recipientAccount = getAccount(recipient)
        let receiverRef = recipientAccount.capabilities
          .get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
          .borrow()
          ?? panic("Could not borrow receiver reference to the recipient's Vault")
        
        receiverRef.deposit(from: <-self.sentVault)
      }
    }
  `,

  // Generic token transfer
  TRANSFER_TOKEN: `
    import FungibleToken from 0x9a0766d93b6608b7

    transaction(
      amount: UFix64, 
      recipient: Address,
      senderStoragePath: String,
      recipientReceiverPath: String
    ) {
      let sentVault: @{FungibleToken.Vault}
      
      prepare(signer: auth(BorrowValue) &Account) {
        let storagePath = StoragePath(identifier: senderStoragePath)
          ?? panic("Invalid storage path")
        
        let vaultRef = signer.storage.borrow<&{FungibleToken.Provider}>(from: storagePath)
          ?? panic("Could not borrow reference to the sender's Vault!")
        
        self.sentVault <- vaultRef.withdraw(amount: amount)
      }
      
      execute {
        let recipientAccount = getAccount(recipient)
        let publicPath = PublicPath(identifier: recipientReceiverPath)
          ?? panic("Invalid receiver path")
        
        let receiverRef = recipientAccount.capabilities
          .get<&{FungibleToken.Receiver}>(publicPath)
          .borrow()
          ?? panic("Could not borrow receiver reference to the recipient's Vault")
        
        receiverRef.deposit(from: <-self.sentVault)
      }
    }
  `,

  // Mock DEX swap transaction
  MOCK_SWAP: `
    import FungibleToken from 0x9a0766d93b6608b7
    import FlowToken from 0x7e60df042a9c0868

    // Mock swap transaction for development
    // In production, this would integrate with a real DEX like Increment, BloctoSwap, etc.
    transaction(
      amountIn: UFix64,
      tokenInAddress: Address,
      tokenOutAddress: Address,
      amountOutMin: UFix64
    ) {
      
      prepare(signer: auth(BorrowValue) &Account) {
        // Mock swap logic - doesn't actually perform a swap
        // Just logs the swap parameters for development
        log("=== Mock Swap Transaction ===")
        log("Signer: ".concat(signer.address.toString()))
        log("Amount In: ".concat(amountIn.toString()))
        log("Token In Address: ".concat(tokenInAddress.toString()))
        log("Token Out Address: ".concat(tokenOutAddress.toString()))
        log("Min Amount Out: ".concat(amountOutMin.toString()))
        
        // In a real DEX integration, you would:
        // 1. Borrow the input token vault
        // 2. Withdraw the input tokens
        // 3. Call the DEX contract's swap function
        // 4. Deposit the output tokens to the user's vault
      }
      
      execute {
        log("Mock swap executed successfully")
        
        // Real DEX integration would be here:
        // let swappedTokens <- DEXContract.swap(
        //   tokensIn: <-inputVault,
        //   tokenOutAddress: tokenOutAddress,
        //   amountOutMin: amountOutMin
        // )
        // recipientVault.deposit(from: <-swappedTokens)
      }
    }
  `
};

// Flow network configurations
export const FLOW_NETWORKS = {
  MAINNET: {
    accessNode: 'https://rest-mainnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/authn'
  },
  TESTNET: {
    accessNode: 'https://rest-testnet.onflow.org', 
    discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn'
  },
  EMULATOR: {
    accessNode: 'http://localhost:8888',
    discoveryWallet: 'http://localhost:8701/fcl/authn'
  }
};

// Configure FCL for the current environment
export const configureFlow = async (network: 'mainnet' | 'testnet' | 'emulator' = 'emulator') => {
  const config = FLOW_NETWORKS[network.toUpperCase() as keyof typeof FLOW_NETWORKS];
  
  fcl.config({
    'accessNode.api': config.accessNode,
    'discovery.wallet': config.discoveryWallet,
    'app.detail.title': 'KittyPunch Swap',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
  });
};

// Utility functions for Flow integration
export const FlowUtils = {
  // Check if Flow network is available
  async isFlowNetworkAvailable(): Promise<boolean> {
    try {
      return await Promise.race([
        checkFlowNetworkConnectivity(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5 second timeout
      ]);
    } catch (error) {
      console.error('Error checking Flow network availability:', error);
      return false;
    }
  },

  // Replace template placeholders with actual contract addresses for the current network
  replaceContractPlaceholders(
    cadenceScript: string, 
    network: 'emulator' | 'testnet' | 'mainnet' = 'emulator'
  ): string {
    const contracts = NETWORK_CONTRACTS[network];
    let processedScript = cadenceScript;
    
    // Replace all contract placeholders
    Object.entries(contracts).forEach(([contractName, address]) => {
      const placeholder = `{{${contractName}}}`;
      processedScript = processedScript.replace(new RegExp(placeholder, 'g'), address);
    });
    
    return processedScript;
  },

  // Get Flow balance for an address
  async getFlowBalance(address: string, network: 'emulator' | 'testnet' | 'mainnet' = 'emulator'): Promise<string> {
    try {
      // Ensure FCL is configured for server-side usage
      configureServerFCL();
      
      // Check network connectivity first with a timeout
      const isConnected = await Promise.race([
        checkFlowNetworkConnectivity(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5 second timeout
      ]);
      
      if (!isConnected) {
        console.warn('Flow network not accessible, using mock balance');
        return '1000.0'; // Mock balance when network is not available
      }
      
      const cadence = this.replaceContractPlaceholders(FLOW_SCRIPTS.GET_FLOW_BALANCE, network);
      const balance = await fcl.query({
        cadence,
        args: (arg, t) => [arg(address, t.Address)],
      });
      return balance?.toString() || '0.0';
    } catch (error) {
      console.error('Error fetching Flow balance:', error);
      return '1000.0'; // Fallback to mock balance
    }
  },

  // Get multiple token balances efficiently
  async getMultipleBalances(address: string, network: 'emulator' | 'testnet' | 'mainnet' = 'emulator'): Promise<Record<string, string>> {
    try {
      // Ensure FCL is configured for server-side usage
      configureServerFCL();
      
      // Check network connectivity first with a timeout
      const isConnected = await Promise.race([
        checkFlowNetworkConnectivity(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5 second timeout
      ]);
      
      if (!isConnected) {
        console.warn('Flow network not accessible, using mock balances');
        return {
          'FLOW': '1000.0',
          'FUSD': '100.0',
          'USDC': '500.0',
          'USDT': '250.0'
        };
      }
      
      const cadence = this.replaceContractPlaceholders(FLOW_SCRIPTS.GET_MULTIPLE_BALANCES, network);
      const balances = await fcl.query({
        cadence,
        args: (arg, t) => [arg(address, t.Address)],
      });
      
      if (balances && typeof balances === 'object') {
        const result: Record<string, string> = {};
        Object.entries(balances).forEach(([token, balance]) => {
          result[token] = balance?.toString() || '0.0';
        });
        return result;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching multiple balances:', error);
      return {
        'FLOW': '1000.0',
        'FUSD': '100.0',
        'USDC': '500.0',
        'USDT': '250.0'
      };
    }
  },

  // Get generic token balance
  async getTokenBalance(
    address: string, 
    tokenContractAddress: string, 
    tokenContractName: string, 
    balancePath: string,
    network: 'emulator' | 'testnet' | 'mainnet' = 'emulator'
  ): Promise<string> {
    try {
      // Ensure FCL is configured for server-side usage
      configureServerFCL();
      
      const cadence = this.replaceContractPlaceholders(FLOW_SCRIPTS.GET_TOKEN_BALANCE, network);
      const balance = await fcl.query({
        cadence,
        args: (arg, t) => [
          arg(address, t.Address),
          arg(tokenContractAddress, t.Address),
          arg(tokenContractName, t.String),
          arg(balancePath, t.String),
        ],
      });
      return balance?.toString() || '0.0';
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return '0.0';
    }
  },

  // Get storage information
  async getStorageInfo(address: string): Promise<{used: string, capacity: string, available: string}> {
    try {
      // Ensure FCL is configured for server-side usage
      configureServerFCL();
      
      const info = await fcl.query({
        cadence: FLOW_SCRIPTS.GET_STORAGE_INFO,
        args: (arg, t) => [arg(address, t.Address)],
      });
      return {
        used: info?.used?.toString() || '0',
        capacity: info?.capacity?.toString() || '0',
        available: info?.available?.toString() || '0',
      };
    } catch (error) {
      console.error('Error fetching storage info:', error);
      return { used: '0', capacity: '0', available: '0' };
    }
  },

  // Submit a transaction and wait for it to be sealed
  async submitTransaction(
    cadence: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    argsFunction: any, 
    gasLimit: number = 1000
  ): Promise<string> {
    try {
      // Ensure FCL is configured for server-side usage
      configureServerFCL();
      
      const txId = await fcl.mutate({
        cadence,
        args: argsFunction,
        payer: fcl.authz,
        proposer: fcl.authz,
        authorizations: [fcl.authz],
        limit: gasLimit
      });

      // Wait for transaction to be sealed
      const transaction = await fcl.tx(txId).onceSealed();
      
      if (transaction.status === 4) { // Sealed successfully
        return txId;
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    }
  }
};

const FlowIntegration = {
  FLOW_SCRIPTS,
  FLOW_TRANSACTIONS,
  FLOW_NETWORKS,
  FlowUtils,
  configureFlow
};

export default FlowIntegration;
