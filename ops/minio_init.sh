#!/bin/bash
# Script to initialize MinIO bucket with object locking and retention policy.
set -eo pipefail # Exit on error, treat unset variables as an error, and propagate pipeline errors.

# --- Configuration ---
# Attempt to determine project name from the parent directory of the 'ops' script for default container name
# This is a common pattern for docker-compose projects (e.g., projectname_minio_1 or projectname-minio-1)
# Default to 'legalmuscle' if auto-detection is tricky or adjust as needed.
PROJECT_DIR_NAME_RAW=$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)")
PROJECT_DIR_NAME="${PROJECT_DIR_NAME_RAW,,}" # Convert to lowercase
MINIO_CONTAINER_NAME_DEFAULT="${PROJECT_DIR_NAME}-minio-1"

# Allow overriding container name via the first script argument
MINIO_CONTAINER_NAME="${1:-$MINIO_CONTAINER_NAME_DEFAULT}"

# --- Environment Variable Loading ---
# Determine the script's directory to find the .env file relative to the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  # Temporarily set all variables defined from now on to be exported
  set -a
  # Source the .env file, loading its variables into the script's environment
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  # Unset the automatic export
  set +a
  echo "[DEBUG] MINIO_ROOT_USER after sourcing .env: '$MINIO_ROOT_USER'"
  echo "[DEBUG] MINIO_ROOT_PASSWORD after sourcing .env: '$MINIO_ROOT_PASSWORD'"
else
  echo "Warning: .env file not found at $ENV_FILE. Make sure MinIO environment variables (MINIO_BUCKET, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD) are set in the environment or Docker Compose file."
fi

# Use MINIO_BUCKET from environment, default to 'evidence'
TARGET_BUCKET_NAME="${MINIO_BUCKET:-evidence}"

# MinIO alias inside the container (usually 'local' pointing to http://127.0.0.1:9000)
# This alias uses the MINIO_ROOT_USER and MINIO_ROOT_PASSWORD the server was started with.
MC_ALIAS="local"

# --- Helper Functions ---
echo_info() {
  echo "[INFO] $1"
}
echo_error() {
  echo "[ERROR] $1" >&2
}

# --- Main Logic ---
echo_info "Starting MinIO bucket initialization..."
echo_info "Target MinIO Container: $MINIO_CONTAINER_NAME"
echo_info "Target Bucket Name: $TARGET_BUCKET_NAME (on alias '$MC_ALIAS')"

# Check if MinIO container is running
if ! docker ps --filter "name=^/${MINIO_CONTAINER_NAME}$" --format "{{.Names}}" | grep -q "^${MINIO_CONTAINER_NAME}$"; then
  echo_error "MinIO container '$MINIO_CONTAINER_NAME' is not running or not found."
  echo_error "Please ensure your Docker Compose stack is up (\`docker compose up -d\`) and the container name is correct."
  echo_error "You can list running containers with \`docker ps\`."
  exit 1
fi
echo_info "MinIO container '$MINIO_CONTAINER_NAME' is running."

echo_info "Ensuring 'local' alias in MinIO container is configured with credentials from .env..."
echo "[DEBUG] MINIO_ROOT_USER before mc alias set: '$MINIO_ROOT_USER'"
echo "[DEBUG] MINIO_ROOT_PASSWORD before mc alias set: '$MINIO_ROOT_PASSWORD'"
# Use MINIO_ROOT_USER and MINIO_ROOT_PASSWORD as these are the server's admin credentials
docker exec "$MINIO_CONTAINER_NAME" mc alias set "$MC_ALIAS" http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --api S3v4
# Verify alias was set (optional, but good for debugging)
docker exec "$MINIO_CONTAINER_NAME" mc alias ls "$MC_ALIAS"

# 1. Create bucket with object lock enabled
echo_info "Attempting to create bucket '$MC_ALIAS/$TARGET_BUCKET_NAME' with object locking..."

# Temporarily disable exit-on-error to ensure we capture the exit code
set +e
# Run mc mb and capture its output and exit code. Using MC_ALIAS as defined earlier.
mb_output=$(docker exec "$MINIO_CONTAINER_NAME" mc mb "$MC_ALIAS/$TARGET_BUCKET_NAME" --with-lock 2>&1)
mb_exit_code=$?
set -e # Re-enable exit-on-error

if [ $mb_exit_code -eq 0 ]; then
  echo_info "Bucket '$MC_ALIAS/$TARGET_BUCKET_NAME' created successfully."
else
  if echo "$mb_output" | grep -q "Your previous request to create the named bucket succeeded and you already own it"; then
    echo_info "Bucket '$MC_ALIAS/$TARGET_BUCKET_NAME' already exists. Proceeding..."
  elif echo "$mb_output" | grep -q "Access Denied"; then
    echo_error "Access Denied while trying to create bucket '$MC_ALIAS/$TARGET_BUCKET_NAME'."
    echo_error "Output: $mb_output"
    echo_error "Please check MinIO server logs and ensure the credentials ('$MINIO_ROOT_USER') have permissions to create buckets."
    exit 1
  else
    echo_error "Failed to create bucket '$MC_ALIAS/$TARGET_BUCKET_NAME'. Exit code: $mb_exit_code"
    echo_error "Output: $mb_output"
    exit 1
  fi
fi

# 2. Set default retention policy
echo_info "Setting default retention for bucket '$MC_ALIAS/$TARGET_BUCKET_NAME' to COMPLIANCE mode for 2555 days..."
docker exec "$MINIO_CONTAINER_NAME" mc retention set --default COMPLIANCE 2555d "$MC_ALIAS/$TARGET_BUCKET_NAME"

echo_info "MinIO bucket initialization process complete for '$MC_ALIAS/$TARGET_BUCKET_NAME'."

# Display current retention policy for confirmation
echo_info "Current retention policy for bucket '$MC_ALIAS/$TARGET_BUCKET_NAME':"
docker exec "$MINIO_CONTAINER_NAME" mc --no-color retention info "$MC_ALIAS/$TARGET_BUCKET_NAME"

echo ""
echo_info "Script finished."
echo_info "To use mc from your host to interact with this MinIO instance (assuming port 9000 is mapped):"
echo_info "1. Install mc: https://min.io/docs/minio/linux/reference/minio-client.html"
echo_info "2. Configure an alias (replace YOUR_ACCESS_KEY and YOUR_SECRET_KEY with values from .env or your MinIO setup):"
echo_info "   mc alias set myminio http://localhost:9000 ${MINIO_ROOT_USER:-YOUR_ACCESS_KEY} ${MINIO_ROOT_PASSWORD:-YOUR_SECRET_KEY}"
  # Note: MINIO_ROOT_USER/PASSWORD are the admin credentials for the MinIO server itself.
  # MINIO_ACCESS_KEY/SECRET_KEY might be different if you created service accounts.
  # For the 'local' alias inside the container, it uses the server's root credentials.
echo_info "3. Then you can run commands like: mc ls myminio/$TARGET_BUCKET_NAME"
