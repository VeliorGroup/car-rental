#!/bin/bash
# =============================================================================
# VPS Setup Script for Hetzner Cloud
# Ubuntu 22.04 LTS / 24.04 LTS
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== FleetPulse VPS Setup ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./vps-setup.sh)${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., carrental.al): " DOMAIN
read -p "Enter your email for SSL certificates: " EMAIL

# =============================================================================
# 1. System Update
# =============================================================================
echo -e "${YELLOW}[1/7] Updating system...${NC}"
apt update && apt upgrade -y

# =============================================================================
# 2. Install Essential Packages
# =============================================================================
echo -e "${YELLOW}[2/7] Installing essential packages...${NC}"
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# =============================================================================
# 3. Install Docker
# =============================================================================
echo -e "${YELLOW}[3/7] Installing Docker...${NC}"

# Remove old versions
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add current user to docker group
usermod -aG docker $SUDO_USER 2>/dev/null || true

echo -e "${GREEN}Docker installed: $(docker --version)${NC}"

# =============================================================================
# 4. Configure Firewall (UFW)
# =============================================================================
echo -e "${YELLOW}[4/7] Configuring firewall...${NC}"

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}Firewall configured${NC}"

# =============================================================================
# 5. Configure Fail2Ban
# =============================================================================
echo -e "${YELLOW}[5/7] Configuring Fail2Ban...${NC}"

cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban

echo -e "${GREEN}Fail2Ban configured${NC}"

# =============================================================================
# 6. Setup Swap (for small VPS)
# =============================================================================
echo -e "${YELLOW}[6/7] Setting up swap...${NC}"

if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Optimize swap usage
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p
    
    echo -e "${GREEN}2GB swap created${NC}"
else
    echo -e "${YELLOW}Swap already exists${NC}"
fi

# =============================================================================
# 7. Create App Directory
# =============================================================================
echo -e "${YELLOW}[7/7] Creating app directory...${NC}"

mkdir -p /opt/carrental
chown -R $SUDO_USER:$SUDO_USER /opt/carrental 2>/dev/null || true

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /opt/carrental"
echo "2. Copy .env.example to .env and configure"
echo "3. Run: ./scripts/setup-ssl.sh $DOMAIN $EMAIL"
echo "4. Run: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "${YELLOW}Server IP: $(curl -s ifconfig.me)${NC}"
echo ""
