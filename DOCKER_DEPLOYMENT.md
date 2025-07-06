# Docker Deployment Guide

This guide explains how to deploy the ETH Global Cannes project using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose installed
- OpenAI API key (optional, for AI features)

### 1. Set Environment Variables
```bash
export OPENAI_API_KEY=your_openai_api_key_here
export PRIVATE_KEY=your_wallet_private_key  # Optional
```

### 2. Deploy with Docker
```bash
# Make the script executable (first time only)
chmod +x deploy.sh

# Start the application
./deploy.sh start
```

## 📋 Available Commands

### Deploy Script Commands
- `./deploy.sh build` - Build the Docker image
- `./deploy.sh start` - Start all services
- `./deploy.sh stop` - Stop all services
- `./deploy.sh restart` - Restart all services
- `./deploy.sh logs` - View real-time logs
- `./deploy.sh clean` - Clean up containers and images
- `./deploy.sh help` - Show help

### Direct Docker Compose Commands
```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🌐 Service Access

Once deployed, you can access:
- **Frontend**: http://localhost:3000 (Next.js app)
- **Vault Backend**: http://localhost:3003 (Express.js API)
- **Python Agent**: http://localhost:8001 (uAgents API)

## ⚙️ Configuration

### Environment Variables
The following environment variables are supported:

#### Flow Configuration
- `NEXT_PUBLIC_FLOW_NETWORK=testnet`
- `NEXT_PUBLIC_ACCESS_NODE_URL=https://rest-testnet.onflow.org`
- `NEXT_PUBLIC_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/testnet/authn`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=2f5a5eba86e7e893eb6c92170c026fbb`

#### API Keys
- `OPENAI_API_KEY` - Required for AI features
- `PRIVATE_KEY` - Optional, for blockchain transactions

#### Backend Configuration
- `RPC_URL=https://mainnet.evm.nodes.onflow.org`

### Custom Configuration
You can modify the `.env.local` file or create a custom docker-compose override:

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  ethglobal-app:
    environment:
      - OPENAI_API_KEY=your_custom_key
      - PRIVATE_KEY=your_private_key
```

## 🔧 Development

### Local Development with Docker
```bash
# Build for development
./deploy.sh build

# Start with logs visible
docker-compose up

# In another terminal, view specific service logs
docker-compose logs -f ethglobal-app
```

### Debugging
```bash
# Access the container shell
docker-compose exec ethglobal-app /bin/sh

# Check running processes
docker-compose exec ethglobal-app ps aux

# Check service health
docker-compose ps
```

## 📦 What's Included

The Docker setup includes:
- **Node.js 18** runtime for the frontend and backend
- **Python 3** for the AI agent
- **All dependencies** automatically installed
- **Process management** for running multiple services
- **Health checks** for service monitoring
- **Graceful shutdown** handling

## 🛠️ Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000,3003,8001
   
   # Stop conflicting services or modify ports in docker-compose.yml
   ```

2. **Build failures**
   ```bash
   # Clean and rebuild
   ./deploy.sh clean
   ./deploy.sh build
   ```

3. **Service startup issues**
   ```bash
   # Check logs
   ./deploy.sh logs
   
   # Check individual service health
   docker-compose ps
   ```

4. **Missing environment variables**
   ```bash
   # Ensure environment variables are set
   echo $OPENAI_API_KEY
   echo $PRIVATE_KEY
   ```

### Performance Tips
- Use `docker-compose up -d` for background execution
- Monitor resource usage with `docker stats`
- Use `./deploy.sh clean` periodically to free up disk space

## 🔒 Security Notes

- Never commit real API keys or private keys to version control
- Use environment variables or Docker secrets for sensitive data
- Consider using a `.env` file for local development (excluded from git)
- The PRIVATE_KEY is optional and only needed for blockchain transactions

## 📚 Further Reading

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
