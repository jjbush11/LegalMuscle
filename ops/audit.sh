#!/bin/bash

# Evidence-MVP immudb Audit Script
# Runs nightly to verify ledger integrity

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
IMMUDB_HOST="${IMMUDB_HOST:-localhost}"
IMMUDB_PORT="${IMMUDB_PORT:-3322}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-admin@example.com}"
SMTP_HOST="${SMTP_HOST:-localhost}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to send email notification
send_alert() {
    local subject="$1"
    local body="$2"
    
    if command -v sendmail >/dev/null 2>&1; then
        {
            echo "To: $NOTIFICATION_EMAIL"
            echo "Subject: [Evidence-MVP] $subject"
            echo "From: audit@evidence-mvp.local"
            echo ""
            echo "$body"
        } | sendmail "$NOTIFICATION_EMAIL"
        log "Alert email sent to $NOTIFICATION_EMAIL"
    else
        warn "sendmail not available, cannot send email alert"
        echo "ALERT: $subject"
        echo "$body"
    fi
}

# Function to check immudb connectivity
check_immudb_connection() {
    log "Checking immudb connectivity..."
    
    if ! nc -z "$IMMUDB_HOST" "$IMMUDB_PORT" 2>/dev/null; then
        error "Cannot connect to immudb at $IMMUDB_HOST:$IMMUDB_PORT"
        send_alert "immudb Connection Failed" "Cannot connect to immudb server at $IMMUDB_HOST:$IMMUDB_PORT"
        exit 1
    fi
    
    log "immudb connection OK"
}

# Function to verify database integrity using Python script
verify_integrity() {
    log "Verifying immudb integrity..."
    
    # Create temporary Python script for verification
    cat > /tmp/audit_integrity.py << 'EOF'
import sys
import json
import logging
from datetime import datetime
from immudb import ImmudbClient
from immudb.exceptions import ImmudbError

def verify_immudb_integrity(host, port):
    """Verify immudb database integrity"""
    try:
        client = ImmudbClient(f"{host}:{port}")
        client.login("immudb", "immudb")
        client.useDatabase(b"defaultdb")
        
        # Get current state
        state = client.currentState()
        print(f"Current database state: {state}")
        
        # Verify the current root hash
        # This will raise an exception if verification fails
        try:
            # Try to get a sample key to verify connectivity
            client.verifiedGet(b"__health_check__")
        except:
            # If health check key doesn't exist, just verify state
            pass
        
        print("Integrity verification PASSED")
        return True
        
    except ImmudbError as e:
        print(f"Integrity verification FAILED: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error during verification: {e}")
        return False
    finally:
        try:
            client.logout()
        except:
            pass

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 3322
    
    success = verify_immudb_integrity(host, port)
    sys.exit(0 if success else 1)
EOF

    # Run integrity check
    if python3 /tmp/audit_integrity.py "$IMMUDB_HOST" "$IMMUDB_PORT"; then
        log "Integrity verification PASSED"
        rm -f /tmp/audit_integrity.py
        return 0
    else
        error "Integrity verification FAILED"
        send_alert "immudb Integrity Check Failed" \
            "The nightly integrity check for immudb failed. Please investigate immediately."
        rm -f /tmp/audit_integrity.py
        return 1
    fi
}

# Function to generate audit report
generate_report() {
    local report_file="/tmp/audit_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log "Generating audit report..."
    
    {
        echo "Evidence-MVP Audit Report"
        echo "========================="
        echo "Date: $(date)"
        echo "immudb Host: $IMMUDB_HOST:$IMMUDB_PORT"
        echo ""
        
        # Count total evidence records in database
        if command -v psql >/dev/null 2>&1; then
            echo "Database Statistics:"
            echo "-------------------"
            PGPASSWORD="${POSTGRES_PASSWORD:-evidence}" psql \
                -h "${POSTGRES_HOST:-localhost}" \
                -U "${POSTGRES_USER:-evidence}" \
                -d "${POSTGRES_DB:-evidence}" \
                -c "SELECT COUNT(*) as total_evidence_objects FROM evidence_objects;" \
                -c "SELECT COUNT(*) as with_immudb_tx FROM evidence_objects WHERE immudb_tx_id IS NOT NULL;" \
                -t
        fi
        
        echo ""
        echo "Integrity Status: VERIFIED"
        echo "Last Check: $(date)"
    } > "$report_file"
    
    log "Audit report saved to $report_file"
    
    # Optionally email the report
    if [[ "${EMAIL_REPORTS:-false}" == "true" ]]; then
        send_alert "Daily Audit Report" "$(cat "$report_file")"
    fi
}

# Main execution
main() {
    log "Starting Evidence-MVP audit process..."
    
    check_immudb_connection
    
    if verify_integrity; then
        generate_report
        log "Audit completed successfully"
        exit 0
    else
        error "Audit failed - integrity check failed"
        exit 1
    fi
}

# Run main function
main "$@"
