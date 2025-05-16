# Load environment variables
if (!(Test-Path -Path ".env")) {
    Write-Host "Creating .env file from .env.example template..."
    Copy-Item -Path ".env.example" -Destination ".env"
    Write-Host "Created .env file. Please review and update values as needed."
}

# Build and start containers
Write-Host "Building and starting all containers..."
docker compose up -d --build

# Wait for containers to stabilize
Write-Host "Waiting for containers to stabilize..."
Start-Sleep -Seconds 10

# Check container status
Write-Host "Checking container health status..."
docker compose ps

# Provide next steps
Write-Host "`nSmoke test complete. If all containers are running, the infrastructure bootstrap is successful."
Write-Host "You can access:"
Write-Host "- API: http://localhost:80"
Write-Host "- SPA: http://localhost:5173"
Write-Host "- MinIO Console: http://localhost:9001"
Write-Host "- PostgreSQL: localhost:5432"
Write-Host "- ImmuDB: localhost:3322"
