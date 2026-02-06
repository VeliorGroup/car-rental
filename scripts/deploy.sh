#!/bin/bash
# =============================================================================
# Deployment Script
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Car Rental Deployment ===${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Copy .env.example to .env and configure it first"
    exit 1
fi

# Build and deploy
echo -e "${YELLOW}[1/3] Building images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}[2/3] Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down

echo -e "${YELLOW}[3/3] Starting new containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for health check
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check status
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Check logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
