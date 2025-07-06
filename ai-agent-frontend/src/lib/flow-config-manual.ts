import * as fcl from '@onflow/fcl';

// Manual FCL configuration for emulator without discovery service
export const initFlowConfigManual = () => {
  fcl.config({
    'accessNode.api': 'https://rest-testnet.onflow.org',
    'flow.network': 'testnet',
    'app.detail.title': 'Flow AI DeFi Agent',
    'app.detail.icon': 'https://placekitten.com/g/200/200',
  });

  // Manually add the dev wallet service
  fcl.config.put('challenge.handshake', async () => {
    return {
      f_type: 'PollingResponse',
      f_vsn: '1.0.0',
      status: 'PENDING',
      reason: null,
      data: {
        f_type: 'AuthnResponse',
        f_vsn: '1.0.0',
        addr: null,
        services: [
          {
            f_type: 'Service',
            f_vsn: '1.0.0',
            type: 'authn',
            method: 'HTTP/POST',
            endpoint: 'http://localhost:8701/fcl/authn',
            uid: 'dev-wallet',
            id: 'dev-wallet',
            identity: {
              address: null
            },
            provider: {
              f_type: 'ServiceProvider',
              f_vsn: '1.0.0',
              address: null,
              name: 'Flow Dev Wallet',
              icon: 'https://raw.githubusercontent.com/onflow/fcl-dev-wallet/main/public/favicon.ico',
              description: 'Flow Developer Wallet for local development',
              color: '#fff',
              supportEmail: null,
              website: null
            }
          }
        ]
      }
    };
  });

  console.log('Flow configured manually for emulator');
};

export default initFlowConfigManual;
