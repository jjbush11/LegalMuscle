#!/bin/bash

# Setup nightly audit cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make audit script executable
chmod +x "$SCRIPT_DIR/audit.sh"

# Add to crontab (runs at 2 AM daily)
(crontab -l 2>/dev/null; echo "0 2 * * * $SCRIPT_DIR/audit.sh >> /var/log/evidence-mvp-audit.log 2>&1") | crontab -

echo "Audit cron job installed - runs daily at 2 AM"
echo "Logs will be written to /var/log/evidence-mvp-audit.log"
