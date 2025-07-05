# Flow AI DeFi Agent Frontend

A modern React/Next.js frontend for interacting with an AI agent that simplifies DeFi operations on the Flow blockchain.

## Features

- 🔗 **Flow Wallet Integration**: Connect using @onflow/kit with support for multiple wallets
- 🤖 **AI Agent Chat**: Interactive chat interface for DeFi guidance and operations
- 💰 **DeFi Operations**: Swap, stake, lend, and borrow tokens with simplified UI
- 📱 **Responsive Design**: Beautiful and modern interface with Tailwind CSS
- ⚡ **Real-time Updates**: Live transaction status and balance updates

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Flow CLI (for local development)
- Flow Dev Wallet (for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Flow Local Development Setup

For full functionality, you'll need to run the Flow emulator and dev wallet:

1. Start the Flow emulator:
```bash
flow emulator start
```

2. In another terminal, start the Dev Wallet:
```bash
flow dev-wallet
```

The Dev Wallet will be available at [http://localhost:8701](http://localhost:8701)

## Architecture

The application consists of several key components:

- **WalletConnection**: Handles Flow wallet connection and authentication
- **ChatInterface**: Interactive chat UI for communicating with the AI agent
- **DefiOperationsPanel**: Quick access to common DeFi operations
- **FlowProvider**: Wraps the app with Flow blockchain connectivity

## AI Agent Integration

The current implementation includes a mock AI agent for demonstration. To integrate with a real AI agent:

1. Replace the `generateAgentResponse` function in `src/app/page.tsx`
2. Implement actual API calls to your AI service
3. Add proper error handling and loading states

## DeFi Operations

The frontend is prepared to handle the following DeFi operations:

- **Token Swapping**: Exchange FLOW for USDC, USDT, etc.
- **Staking**: Stake FLOW tokens to earn rewards
- **Lending**: Lend assets to earn interest
- **Borrowing**: Borrow assets using collateral

## Smart Contract Integration

To integrate with smart contracts:

1. Add your contract deployments to `flow.json`
2. Create Cadence scripts and transactions in a `/cadence` directory
3. Use Flow kit hooks (`useFlowQuery`, `useFlowMutate`) for blockchain interactions

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **@onflow/kit**: Flow blockchain integration
- **Lucide React**: Modern icon library
