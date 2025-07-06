#!/bin/bash

# ETH Global Cannes - Docker Deployment Script
# This script helps you deploy the entire project using Docker

set -e

echo "🚀 ETH Global Cannes - Docker Deployment"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to display help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  build     Build the Docker image"
    echo "  start     Start the services"
    echo "  stop      Stop the services"
    echo "  restart   Restart the services"
    echo "  logs      Show logs"
    echo "  clean     Clean up containers and images"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  OPENAI_API_KEY    Your OpenAI API key (required for AI features)"
    echo "  PRIVATE_KEY       Your wallet private key (optional, for blockchain operations)"
    echo ""
    echo "Examples:"
    echo "  OPENAI_API_KEY=your_key $0 start"
    echo "  $0 logs"
}

# Function to check environment
check_environment() {
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  Warning: OPENAI_API_KEY is not set. AI features may not work."
        echo "   Set it with: export OPENAI_API_KEY=your_openai_api_key"
        echo ""
    fi

    if [ -z "$PRIVATE_KEY" ]; then
        echo "ℹ️  Info: PRIVATE_KEY is not set. Running in read-only mode for blockchain operations."
        echo ""
    fi
}

# Function to build the Docker image
build_image() {
    echo "🔨 Building Docker image..."
    docker-compose build
    echo "✅ Build completed!"
}

# Function to start services
start_services() {
    echo "🚀 Starting services..."
    check_environment
    docker-compose up -d
    echo ""
    echo "✅ Services started!"
    echo ""
    echo "🌐 Access your application at:"
    echo "   Frontend:      http://localhost:3000"
    echo "   Vault Backend: http://localhost:3003"
    echo "   Python Agent: http://localhost:8001"
    echo ""
    echo "📋 Use '$0 logs' to view logs"
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    docker-compose down
    echo "✅ Services stopped!"
}

# Function to restart services
restart_services() {
    echo "🔄 Restarting services..."
    stop_services
    start_services
}

# Function to show logs
show_logs() {
    echo "📋 Showing logs (press Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down -v --rmi all --remove-orphans
    echo "✅ Cleanup completed!"
}

# Main script logic
case "${1:-start}" in
    build)
        build_image
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    clean)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
