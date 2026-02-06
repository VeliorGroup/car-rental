#!/bin/bash

# Setup automated database backup cron job
# Run this once on the production server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-db.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Add cron job: daily at 2:00 AM
CRON_JOB="0 2 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> /var/log/carrental-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
  echo "Backup cron job already exists. Updating..."
  crontab -l 2>/dev/null | grep -v "backup-db.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron job installed successfully:"
echo "  Schedule: Daily at 2:00 AM"
echo "  Log: /var/log/carrental-backup.log"
echo ""
echo "Verify with: crontab -l"
