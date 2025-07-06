# Multi-stage Dockerfile for the ETH Global Cannes project
FROM node:18-alpine AS frontend-base

# Install Python and other dependencies
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy the entire project
COPY . .

# Install Node.js dependencies
WORKDIR /app/ai-agent-frontend
RUN npm install

# Install Python dependencies
WORKDIR /app
RUN pip3 install --break-system-packages -r requirements.txt

# Set environment variables
ENV NODE_ENV=development
ENV PYTHONUNBUFFERED=1

# Expose ports for all services
EXPOSE 3000 3003 8001

# Copy and set up the startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
