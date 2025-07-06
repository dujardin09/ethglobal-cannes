import * as fcl from '@onflow/fcl';

// Direct Flow configuration that should work with local emulator and dev wallet
export const initFlowConfigDirect = () => {
  fcl.config({
    // Access node configuration
    'accessNode.api': 'https://rest-testnet.onflow.org',

    // Network configuration
    'flow.network': 'testnet',

    // Discovery configuration - required by FlowProvider even if we bypass it
    'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
    'discovery.authn.endpoint': 'https://fcl-discovery.onflow.org/testnet/authn',
    'discovery.authn.include': ['http://localhost:8701/fcl/authn'],

    // Direct service configuration for dev wallet
    'challenge.handshake': 'http://localhost:8701/fcl/authn',

    // App metadata
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
    'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',

    // WalletConnect configuration - required to avoid warnings
    'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
    'walletconnect.includeBaseWC': true,
  });

  console.log('Flow configured for emulator with direct dev wallet connection');
};

export default initFlowConfigDirect;
