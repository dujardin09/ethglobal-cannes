import * as fcl from '@onflow/fcl';

// Configure FCL for Flow blockchain interaction
export const initFlowConfig = () => {
  fcl.config({
    // Access node configuration
    'accessNode.api': process.env.NEXT_PUBLIC_ACCESS_NODE_URL || 'http://localhost:8888',
    
    // Network configuration
    'flow.network': process.env.NEXT_PUBLIC_FLOW_NETWORK || 'emulator',
    
    // Discovery wallet configuration
    'discovery.wallet': process.env.NEXT_PUBLIC_DISCOVERY_WALLET || 'https://fcl-discovery.onflow.org/emulator/authn',
    
    // WalletConnect configuration
    'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
    'walletconnect.includeBaseWC': true,
    
    // Optional: App metadata for WalletConnect
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
    'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',
    'app.detail.url': typeof window !== 'undefined' ? window.location.origin : '',
  });
};

export default initFlowConfig;
