#!/bin/sh

echo "🚀 Starting ETH Global Cannes Project..."

# Start the vault backend
echo "📡 Starting vault backend..."
cd /app/ai-agent-frontend/src/server
node vault-backend-real.js &
VAULT_PID=$!

# Start the Python agent
echo "🤖 Starting Python agent..."
cd /app/ai_agent_special
python3 agent_special.py &
AGENT_PID=$!

# Start the Next.js frontend
echo "🌐 Starting Next.js frontend..."
cd /app/ai-agent-frontend
npm run dev &
FRONTEND_PID=$!

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $VAULT_PID $AGENT_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handling
trap cleanup TERM INT

# Wait for all processes
wait $VAULT_PID $AGENT_PID $FRONTEND_PID
