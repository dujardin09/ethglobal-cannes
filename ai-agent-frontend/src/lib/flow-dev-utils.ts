/**
 * Development utilities for Flow blockchain integration
 * Handles common development warnings and provides better UX
 */

// Flag to track if dev warnings have been shown
let devWarningsShown = false;
let cssWarningsShown = false;
let sourceMapWarningsShown = false;

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
      message.includes('Starting WS connection skipped because the client has no topics') ||
      message.includes('FCL WalletConnect Service Plugin') ||
      message.includes('All dApps are expected to register for a WalletConnect projectId') ||
      message.includes('Download the React DevTools for a better development experience') ||
      message.includes('preloaded with link preload was not used within a few seconds') ||
      message.includes('Error in parsing value for \'-webkit-text-size-adjust\'') ||
      message.includes('Unknown property \'-moz-osx-font-smoothing\'') ||
      message.includes(':host selector') ||
      message.includes('Unknown pseudo-class or pseudo-element \'global\'') ||
      message.includes('unreachable code after return statement')
    ) {
      // Show a simplified message once
      if (!devWarningsShown) {
        console.info('ℹ️ Flow Development Mode: Some warnings are expected in dev mode (private keys, deprecated types, CSS vendor prefixes, etc.)');
        devWarningsShown = true;
      }
      return;
    }
    
    // Filter CSS-related warnings
    if (
      message.includes('Declaration dropped') ||
      message.includes('Ruleset ignored due to bad selector')
    ) {
      if (!cssWarningsShown) {
        console.info('ℹ️ CSS Development Mode: Vendor-specific CSS properties may show warnings in dev mode');
        cssWarningsShown = true;
      }
      return;
    }
    
    // Show other warnings normally
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter source map errors that don't affect functionality
    if (
      message.includes('Source map error') ||
      message.includes('NetworkError when attempting to fetch resource') ||
      message.includes('.css.map') ||
      message.includes('.js.map')
    ) {
      if (!sourceMapWarningsShown) {
        console.info('ℹ️ Source Maps: Some source map files are not available in development mode');
        sourceMapWarningsShown = true;
      }
      return;
    }
    
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
      message.includes('session request queue is empty') ||
      message.includes('Starting WS connection skipped because the client has no topics') ||
      message.includes('Core Initialization Success') ||
      (typeof args[0] === 'object' && args[0]?.context === 'client') ||
      (typeof args[0] === 'object' && args[0]?.msg?.includes('Starting WS connection skipped'))
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
