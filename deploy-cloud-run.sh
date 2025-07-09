#!/bin/bash

# ==============================================================================
# Holitime - Google Cloud Run Deployment Script
#
# Description:
#   This script builds a Docker image for the Holitime application locally,
#   pushes it to Google Container Registry (GCR), and deploys it to
#   Google Cloud Run.
#
# Prerequisites:
#   - Google Cloud SDK (gcloud)
#   - Docker Desktop
#
# Usage:
#   1. Make sure you are authenticated with gcloud and Docker.
#   2. Set the configuration variables in the "Configuration" section below
#      or create a .env file with the same variable names.
#   3. Run the script: ./deploy-cloud-run.sh
#
# ==============================================================================

# --- Configuration ---
# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Google Cloud Settings
PROJECT_ID="${PROJECT_ID:-handsonlabor}"
SERVICE_NAME="${SERVICE_NAME:-holitime}"
REGION="${REGION:-us-central1}"

# Docker Image Settings
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# --- Script Setup ---
# Exit immediately if a command exits with a non-zero status.
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Functions ---

check_prerequisites() {
  echo -e "${BLUE}INFO:${NC} Checking for required tools..."
  if ! command -v gcloud > /dev/null; then
    echo -e "${RED}ERROR:${NC} Google Cloud CLI (gcloud) is not installed. Please install it."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi
  if ! command -v docker > /dev/null; then
    echo -e "${RED}ERROR:${NC} Docker is not installed. Please install it."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
  fi
  echo -e "${GREEN}SUCCESS:${NC} All prerequisites are installed."
}

authenticate() {
  echo -e "${BLUE}INFO:${NC} Checking Google Cloud authentication..."
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}WARNING:${NC} Not authenticated with Google Cloud. Initiating login..."
    gcloud auth login
  fi
  gcloud config set project "${PROJECT_ID}"
  echo -e "${GREEN}SUCCESS:${NC} Google Cloud project set to ${PROJECT_ID}."

  echo -e "${BLUE}INFO:${NC} Configuring Docker to authenticate with Google Container Registry..."
  gcloud auth configure-docker -q
  echo -e "${GREEN}SUCCESS:${NC} Docker configured."
}

enable_gcp_apis() {
    echo -e "${BLUE}INFO:${NC} Enabling required Google Cloud APIs..."
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    echo -e "${GREEN}SUCCESS:${NC} APIs enabled."
}


build_image() {
  echo -e "${BLUE}INFO:${NC} Building Docker image locally: ${IMAGE_NAME}"
  
  # Clean up previous builds
  echo -e "${BLUE}INFO:${NC} Cleaning up old Docker images..."
  docker system prune -af

  # Build the image using Docker Desktop
  export DOCKER_BUILDKIT=1
  docker build --progress=plain -t "${IMAGE_NAME}" .

  echo -e "${GREEN}SUCCESS:${NC} Docker image built successfully."
}

build_and_push_image() {
  build_image
  echo -e "${BLUE}INFO:${NC} Pushing image to Google Container Registry..."
  docker push "${IMAGE_NAME}"
  echo -e "${GREEN}SUCCESS:${NC} Image pushed to GCR."
}

deploy_to_cloud_run() {
  echo -e "${BLUE}INFO:${NC} Deploying to Google Cloud Run..."

  # Define secrets to be fetched from Google Secret Manager
  local secrets=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "GOOGLE_API_KEY"
    "JWT_SECRET"
  )

  # Check for secrets and construct the --set-secrets argument
  local secret_args=""
  for secret_name in "${secrets[@]}"; do
    if gcloud secrets describe "${secret_name}" >/dev/null 2>&1; then
      secret_args+="--set-secrets=${secret_name}=${secret_name}:latest "
    else
      echo -e "${RED}ERROR:${NC} Secret '${secret_name}' not found in Google Secret Manager."
      echo -e "${YELLOW}Please create it using the following command:${NC}"
      echo "gcloud secrets create ${secret_name} --replication-policy=\"automatic\" && echo \"YOUR_SECRET_VALUE\" | gcloud secrets versions add ${secret_name} --data-file=-"
      exit 1
    fi
  done

  # Define environment variables (non-secret)
  local env_vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,DATABASE_PROVIDER=aiven,DATABASE_SSL=true"
  env_vars+=",NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app"

  gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform "managed" \
    --region "${REGION}" \
    --allow-unauthenticated \
    --port "3000" \
    --memory "2Gi" \
    --cpu "2" \
    --min-instances "0" \
    --max-instances "1" \
    --timeout "300" \
    --concurrency "80" \
    --set-env-vars "${env_vars}" \
    ${secret_args} \
    --quiet

  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')
  
  echo -e "${GREEN}SUCCESS:${NC} Deployment complete!"
  echo -e "Service URL: ${YELLOW}${SERVICE_URL}${NC}"
}

run_local() {
  echo -e "${BLUE}INFO:${NC} Running Docker container locally..."

  # Create a temporary env file for local run
  cat > .env.local.run << EOF
NODE_ENV="development"
NEXT_TELEMETRY_DISABLED="1"
DATABASE_URL="postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require"
DATABASE_PROVIDER="aiven"
DATABASE_SSL="true"
NEXTAUTH_SECRET="holitime-super-secure-secret-key-for-local-dev-2024"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_API_KEY="AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k"
JWT_SECRET="holitime-jwt-secret-key-for-local-dev-2024"
EOF

  # Function to clean up the env file
  cleanup() {
    echo -e "\n${BLUE}INFO:${NC} Cleaning up temporary files..."
    rm -f .env.local.run
    echo -e "${GREEN}SUCCESS:${NC} Cleanup complete."
  }

  # Trap EXIT signal to ensure cleanup happens
  trap cleanup EXIT

  docker run --rm -p 3000:3000 --env-file .env.local.run "${IMAGE_NAME}"

  echo -e "${GREEN}SUCCESS:${NC} Container stopped."
}


# --- Main Execution ---
main() {
  if [ "$1" == "local" ]; then
    echo -e "${BLUE}🚀 Starting Holitime Local Build & Run 🚀${NC}"
    check_prerequisites
    build_image
    run_local
    echo -e "${GREEN}🎉 Local run finished! 🎉${NC}"
  else
    echo -e "${BLUE}🚀 Starting Holitime Deployment to Cloud Run 🚀${NC}"
    check_prerequisites
    authenticate
    enable_gcp_apis
    build_and_push_image
    deploy_to_cloud_run

    echo -e "${GREEN}🎉 All steps completed successfully! 🎉${NC}"
    echo -e "${BLUE}--- Useful Commands ---${NC}"
    echo -e "View logs: ${YELLOW}gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}${NC}"
    echo -e "Update service: ${YELLOW}gcloud run services update ${SERVICE_NAME} --region ${REGION}${NC}"
    echo -e "Delete service: ${YELLOW}gcloud run services delete ${SERVICE_NAME} --region ${REGION}${NC}"
  fi
}

main "$@"
