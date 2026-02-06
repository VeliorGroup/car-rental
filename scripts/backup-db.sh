#!/bin/bash

# Database Backup Script
# Creates automated backups of PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/car_rental_backup_${TIMESTAMP}.sql.gz"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL not set${NC}"
  exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Backup file: $BACKUP_FILE"

# Perform backup
export PGPASSWORD="$DB_PASS"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

unset PGPASSWORD

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup completed successfully${NC}"
  echo "  Size: $BACKUP_SIZE"
  echo "  File: $BACKUP_FILE"
else
  echo -e "${RED}✗ Backup failed${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Cleanup old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "car_rental_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo -e "${GREEN}✓ Backup process completed${NC}"

# Verify backup integrity (restore test to /dev/null)
echo -e "${YELLOW}Verifying backup integrity...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo -e "${GREEN}✓ Backup file integrity verified${NC}"
else
  echo -e "${RED}✗ Backup file is corrupted!${NC}"
  exit 1
fi

# Optional: Upload to cloud storage (S3, etc.)
# Uncomment and configure if needed
# if [ -n "$S3_BUCKET" ]; then
#   aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
# fi
