import * as fcl from '@onflow/fcl';

// Network-specific configurations
const NETWORK_CONFIGS = {
  emulator: {
    accessNodeUrl: 'https://rest-testnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
    discoveryAuthnEndpoint: 'https://fcl-discovery.onflow.org/testnet/authn',
  },
  testnet: {
    accessNodeUrl: 'https://rest-testnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
    discoveryAuthnEndpoint: 'https://fcl-discovery.onflow.org/testnet/authn',
  },
  mainnet: {
    accessNodeUrl: 'https://rest-mainnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/authn',
    discoveryAuthnEndpoint: 'https://fcl-discovery.onflow.org/authn',
  }
};

// Configure FCL for Flow blockchain interaction
export const initFlowConfig = () => {
  const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet') as keyof typeof NETWORK_CONFIGS;
  const networkConfig = NETWORK_CONFIGS[network] || NETWORK_CONFIGS.testnet;

  fcl.config({
    // Access node configuration
    'accessNode.api': process.env.NEXT_PUBLIC_ACCESS_NODE_URL || networkConfig.accessNodeUrl,

    // Network configuration
    'flow.network': network,

    // Discovery wallet configuration
    'discovery.wallet': process.env.NEXT_PUBLIC_DISCOVERY_WALLET || networkConfig.discoveryWallet,

    // Discovery authentication endpoint - REQUIRED
    'discovery.authn.endpoint': process.env.NEXT_PUBLIC_DISCOVERY_AUTHN_ENDPOINT || networkConfig.discoveryAuthnEndpoint,

    // Discovery authentication include configuration - include local dev wallet
    'discovery.authn.include': network === 'testnet' ? [
      'https://fcl-discovery.onflow.org/testnet/authn'  // Local dev wallet
    ] : [],

    // WalletConnect configuration
    'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
    'walletconnect.includeBaseWC': true,

    // Optional: App metadata for WalletConnect
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
    'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',
    'app.detail.url': typeof window !== 'undefined' ? window.location.origin : '',

    // Service discovery timeout (helps with network errors)
    'service.discovery.timeout': 10000,
  });

  console.log(`Flow configured for ${network} network`);
};

export default initFlowConfig;
