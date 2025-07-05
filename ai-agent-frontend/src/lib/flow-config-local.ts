import * as fcl from '@onflow/fcl';

// Simple local-only Flow configuration that avoids discovery service
export const initFlowConfigLocal = () => {
  fcl.config({
    // Access node configuration
    'accessNode.api': 'http://localhost:8888',
    
    // Network configuration
    'flow.network': 'emulator',
    
    // App metadata
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
    'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',
    'app.detail.url': typeof window !== 'undefined' ? window.location.origin : '',
    
    // WalletConnect configuration
    'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
    'walletconnect.includeBaseWC': true,
    
    // Minimal discovery configuration to prevent errors
    'discovery.authn.endpoint': 'data:application/json;base64,eyJmX3R5cGUiOiJEaXNjb3ZlcnlSZXNwb25zZSIsImZfdnNuIjoiMS4wLjAiLCJzZXJ2aWNlcyI6W119',
    'discovery.authn.include': ['http://localhost:8701/fcl/authn'],
    
    // Challenge handshake for direct dev wallet connection
    'challenge.handshake': 'http://localhost:8701/fcl/authn',
  });
  
  console.log('Flow configured for local emulator with dev wallet');
};

export default initFlowConfigLocal;
