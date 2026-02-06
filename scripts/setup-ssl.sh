#!/bin/bash
# =============================================================================
# SSL Certificate Setup with Let's Encrypt
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Usage: ./setup-ssl.sh <domain> <email>${NC}"
    echo "Example: ./setup-ssl.sh carrental.al admin@carrental.al"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo -e "${GREEN}=== SSL Certificate Setup ===${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./setup-ssl.sh)${NC}"
    exit 1
fi

# =============================================================================
# 1. Install Certbot
# =============================================================================
echo -e "${YELLOW}[1/4] Installing Certbot...${NC}"

apt update
apt install -y certbot

# =============================================================================
# 2. Stop nginx if running
# =============================================================================
echo -e "${YELLOW}[2/4] Stopping services...${NC}"

docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# =============================================================================
# 3. Obtain Certificate
# =============================================================================
echo -e "${YELLOW}[3/4] Obtaining SSL certificate...${NC}"

certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --preferred-challenges http

# =============================================================================
# 4. Update nginx configuration
# =============================================================================
echo -e "${YELLOW}[4/4] Updating nginx configuration...${NC}"

# Replace domain placeholder in nginx.conf
sed -i "s/\${DOMAIN}/$DOMAIN/g" docker/nginx/nginx.conf

# =============================================================================
# 5. Setup Auto-Renewal
# =============================================================================
echo -e "${YELLOW}Setting up auto-renewal...${NC}"

# Create renewal script
cat > /etc/cron.d/certbot-renewal << EOF
0 0 1 * * root certbot renew --quiet --post-hook "docker compose -f /opt/carrental/docker-compose.prod.yml restart nginx"
EOF

chmod 644 /etc/cron.d/certbot-renewal

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
echo ""
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "Auto-renewal configured (1st of each month)"
echo ""
echo "Next step:"
echo "docker compose -f docker-compose.prod.yml up -d"
echo ""
