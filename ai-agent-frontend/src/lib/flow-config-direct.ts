import * as fcl from '@onflow/fcl';

// Direct Flow configuration that should work with local emulator and dev wallet
export const initFlowConfigDirect = () => {
  fcl.config({
    // Access node configuration
    'accessNode.api': 'http://localhost:8888',
    
    // Network configuration
    'flow.network': 'emulator',
    
    // Direct service configuration - this bypasses discovery
    'service.OpenID.scopes': 'email',
    'challenge.handshake': 'http://localhost:8701/fcl/authn',
    
    // App metadata
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
    'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',
    
    // Disable discovery service to avoid network errors
    'discovery.wallet': undefined,
    'discovery.authn.endpoint': undefined,
  });
  
  console.log('Flow configured for emulator with direct dev wallet connection');
};

export default initFlowConfigDirect;
