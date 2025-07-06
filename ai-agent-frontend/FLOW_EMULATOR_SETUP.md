# Flow Emulator Setup Guide

## Quick Start with Real Flow Blockchain

To test the AI DeFi Agent with **real Flow blockchain calls** instead of mock data:

### 1. Install Flow CLI
```bash
# macOS
brew install flow-cli

# Linux/Windows - Download from: https://github.com/onflow/flow-cli/releases
```

### 2. Start Flow Emulator
```bash
# In a separate terminal window
flow emulator start

# You should see:
# INFO[0000] ⚡ Starting emulator                          port=3569
# INFO[0000] 🌱 Starting HTTP server                     port=8888
```

### 3. Test Real Blockchain Integration
```bash
# Run the API test again - now it should show "blockchain" as data source
node test-api.js

# Or test directly:
curl "http://localhost:3000/api/tokens/balances?userAddress=0x01cf0e2f2f715450" | jq '.metadata.dataSource'
# Should return: "blockchain"
```

### 4. Deploy Contracts (Optional)
```bash
# Deploy the standard contracts
flow project deploy --network emulator
```

## Expected Behavior

### With Flow Emulator Running:
- ✅ `dataSource: "blockchain"`
- ✅ `flowNetworkAvailable: true` 
- ✅ Real FLOW token balance queries
- ✅ Real transaction submission capability

### Without Flow Emulator:
- ✅ `dataSource: "mock"`
- ✅ `flowNetworkAvailable: false`
- ✅ Fallback to mock data (seamless for development)
- ✅ All features still work for testing

## Production Deployment

For production, update the environment variables:

```bash
# For testnet
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_ACCESS_NODE_URL=https://rest-testnet.onflow.org

# For mainnet  
NEXT_PUBLIC_FLOW_NETWORK=mainnet
NEXT_PUBLIC_ACCESS_NODE_URL=https://rest-mainnet.onflow.org
```

The AI DeFi Agent will automatically switch to real blockchain queries on these networks!
