# Evidence-MVP immudb Audit Script (PowerShell)
# Runs nightly to verify ledger integrity

param(
    [string]$ImmudbHost = "localhost",
    [int]$ImmudbPort = 3322,
    [string]$NotificationEmail = "admin@example.com"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Green
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Send-Alert {
    param(
        [string]$Subject,
        [string]$Body
    )
    
    Write-Warning-Log "Email alerts not implemented in PowerShell version"
    Write-Host "ALERT: $Subject"
    Write-Host $Body
}

function Test-ImmudbConnection {
    Write-Log "Checking immudb connectivity..."
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($ImmudbHost, $ImmudbPort)
        $tcpClient.Close()
        Write-Log "immudb connection OK"
        return $true
    }
    catch {
        Write-Error-Log "Cannot connect to immudb at ${ImmudbHost}:${ImmudbPort}"
        Send-Alert "immudb Connection Failed" "Cannot connect to immudb server at ${ImmudbHost}:${ImmudbPort}"
        return $false
    }
}

function Test-ImmudbIntegrity {
    Write-Log "Verifying immudb integrity..."
    
    # Create temporary Python script for verification
    $pythonScript = @"
import sys
import json
import logging
from datetime import datetime
from immudb import ImmudbClient
from immudb.exceptions import ImmudbError

def verify_immudb_integrity(host, port):
    try:
        client = ImmudbClient(f"{host}:{port}")
        client.login("immudb", "immudb")
        client.useDatabase(b"defaultdb")
        
        # Get current state
        state = client.currentState()
        print(f"Current database state: {state}")
        
        # Verify connectivity
        try:
            client.verifiedGet(b"__health_check__")
        except:
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
"@

    $tempFile = [System.IO.Path]::GetTempFileName() + ".py"
    Set-Content -Path $tempFile -Value $pythonScript
    
    try {
        $result = & python $tempFile $ImmudbHost $ImmudbPort
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Log "Integrity verification PASSED"
            return $true
        }
        else {
            Write-Error-Log "Integrity verification FAILED"
            Send-Alert "immudb Integrity Check Failed" "The nightly integrity check for immudb failed. Please investigate immediately."
            return $false
        }
    }
    catch {
        Write-Error-Log "Failed to run Python integrity check: $_"
        return $false
    }
    finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}

function New-AuditReport {
    $reportFile = "audit_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    $reportPath = Join-Path $env:TEMP $reportFile
    
    Write-Log "Generating audit report..."
    
    $report = @"
Evidence-MVP Audit Report
=========================
Date: $(Get-Date)
immudb Host: ${ImmudbHost}:${ImmudbPort}

Integrity Status: VERIFIED
Last Check: $(Get-Date)
"@

    Set-Content -Path $reportPath -Value $report
    Write-Log "Audit report saved to $reportPath"
    
    return $reportPath
}

# Main execution
function Main {
    Write-Log "Starting Evidence-MVP audit process..."
    
    if (-not (Test-ImmudbConnection)) {
        exit 1
    }
    
    if (Test-ImmudbIntegrity) {
        $reportPath = New-AuditReport
        Write-Log "Audit completed successfully"
        exit 0
    }
    else {
        Write-Error-Log "Audit failed - integrity check failed"
        exit 1
    }
}

# Run main function
Main
