/**
 * Development utilities for Flow blockchain integration
 * Handles common development warnings and provides better UX
 */

// Flag to track if dev warnings have been shown
let devWarningsShown = false;

/**
 * Filter console messages to reduce noise in development
 */
export const initDevConsoleFilters = () => {
  if (typeof window === 'undefined' || devWarningsShown) return;
  
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter known development warnings that are expected/harmless
    if (
      message.includes('Private Keys Detected') ||
      message.includes('Passing in Number as value for UInt8 is deprecated') ||
      message.includes('WalletConnect Plugin has been already loaded') ||
      message.includes('Starting WS connection skipped because the client has no topics')
    ) {
      // Show a simplified message once
      if (!devWarningsShown) {
        console.info('ℹ️ Flow Development Mode: Some warnings are expected in dev mode (private keys, deprecated types, etc.)');
        devWarningsShown = true;
      }
      return;
    }
    
    // Show other warnings normally
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter hydration mismatch errors caused by browser extensions
    if (
      message.includes('A tree hydrated but some attributes of the server rendered HTML') &&
      (message.includes('data-channel-name') || message.includes('data-extension-id'))
    ) {
      // Show a simplified message once
      if (!devWarningsShown) {
        console.info('ℹ️ Hydration mismatch from browser extensions (Flow Reference Wallet) - this is harmless');
        devWarningsShown = true;
      }
      return;
    }
    
    // Show other errors normally
    originalConsoleError.apply(console, args);
  };

  console.log = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter verbose Flow/WalletConnect logs
    if (
      message.includes('[frw]') ||
      message.includes('SignClient Initialization Success') ||
      message.includes('session request queue is empty')
    ) {
      return;
    }
    
    // Show other logs normally
    originalConsoleLog.apply(console, args);
  };
};

/**
 * Format Flow account address for display
 */
export const formatFlowAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if we're using the local emulator
 */
export const isLocalEmulator = (): boolean => {
  return (process.env.NEXT_PUBLIC_FLOW_NETWORK || 'emulator') === 'emulator';
};

/**
 * Log Flow-specific messages with consistent formatting
 */
export const logFlow = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  if (isDevelopment()) {
    const prefix = '🌊 Flow:';
    switch (level) {
      case 'info':
        console.info(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
    }
  }
};
