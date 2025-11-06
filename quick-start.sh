#!/bin/bash

# Quick Start Script for Vehicle Management System
# This script sets up and starts the entire system

set -e  # Exit on error

echo "🚀 Vehicle Management System - Quick Start"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules already exists, skipping installation${NC}"
fi
echo ""

# Step 2: Create .env file if it doesn't exist
echo "⚙️  Step 2: Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi
echo ""

# Step 3: Start Docker containers
echo "🐳 Step 3: Starting Docker containers..."
echo "   - PostgreSQL (port 5432)"
echo "   - TimescaleDB (port 5433)"
echo "   - EMQX MQTT Broker (ports 1883, 18083)"
echo ""
docker-compose up -d

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 10

# Check if containers are running
if [ "$(docker-compose ps -q postgres)" ] && [ "$(docker-compose ps -q timescaledb)" ] && [ "$(docker-compose ps -q emqx)" ]; then
    echo -e "${GREEN}✅ All containers are running${NC}"
else
    echo -e "${RED}❌ Some containers failed to start. Check with: docker-compose logs${NC}"
    exit 1
fi
echo ""

# Step 4: Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec vehicle-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT+1))
    sleep 1
done

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec vehicle-timescaledb pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ TimescaleDB is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT+1))
    sleep 1
done
echo ""

# Step 5: Start the application
echo "🚀 Step 5: Starting the NestJS application..."
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "📍 Application will be available at:"
echo "   • API: http://localhost:3000"
echo "   • Swagger Docs: http://localhost:3000/api"
echo ""
echo "📍 EMQX Dashboard:"
echo "   • URL: http://localhost:18083"
echo "   • Username: admin"
echo "   • Password: public"
echo ""
echo "💡 Useful commands:"
echo "   • Stop containers: docker-compose down"
echo "   • View logs: docker-compose logs -f"
echo "   • Run tests: npm test"
echo "   • Run vehicle simulator: node examples/vehicle-simulator.js VEHICLE-001"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Full documentation"
echo "   • API_EXAMPLES.md - API usage examples"
echo "   • ARCHITECTURE.md - System architecture"
echo ""
echo -e "Starting application in development mode...${NC}"
echo ""

npm run start:dev
