import * as fcl from '@onflow/fcl';
import { initDevConsoleFilters, isDevelopment } from './flow-dev-utils';

let isConfigured = false;

// Simple local-only Flow configuration that avoids discovery service
export const initFlowConfigLocal = () => {
  if (isConfigured) {
    console.log('Flow configuration already initialized, skipping...');
    return;
  }

  // Initialize development console filters to reduce noise
  if (isDevelopment()) {
    initDevConsoleFilters();
  }

  try {
    fcl.config({
      // Access node configuration
      'accessNode.api': 'https://rest-testnet.onflow.org',

      // Network configuration
      'flow.network': 'testnet',

      // App metadata
      'app.detail.title': 'AI DeFi Agent',
      'app.detail.icon': '/favicon.ico',
      'app.detail.description': 'AI-powered DeFi assistant for Flow blockchain',
      'app.detail.url': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',

      // WalletConnect configuration - required for wallet reconnection
      'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
      'walletconnect.includeBaseWC': true,

      // Minimal discovery configuration to prevent errors
      'discovery.authn.endpoint': 'data:application/json;base64,eyJmX3R5cGUiOiJEaXNjb3ZlcnlSZXNwb25zZSIsImZfdnNuIjoiMS4wLjAiLCJzZXJ2aWNlcyI6W119',
      'discovery.authn.include': ['http://localhost:8701/fcl/authn'],

      // Challenge handshake for direct dev wallet connection
      'challenge.handshake': 'http://localhost:8701/fcl/authn',
    });

    isConfigured = true;
    console.log('Flow configured for local emulator');
  } catch (error) {
    console.warn('Flow configuration warning (non-critical):', error instanceof Error ? error.message : String(error));
    isConfigured = true; // Still mark as configured to prevent retries
  }
};

export default initFlowConfigLocal;
