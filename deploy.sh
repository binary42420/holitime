#!/bin/bash

# Holitime Cloud Run Deployment Script (using Google Cloud Build)
# This script builds and deploys the Holitime application to Google Cloud Run via Cloud Build.

set -e  # Exit on any error

# --- Configuration ---
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"

# For Artifact Registry: us-central1-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY_NAME>/<SERVICE_NAME>
REPOSITORY_NAME="cloud-run-images"
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)" # Example: holitime:20240423-143000

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"
CLOUDBUILD_CONFIG_FILE="cloudbuild_temp.yaml" # Temporary file for Cloud Build config

# Define all environment variables in an associative array
declare -A ENV_VARS
ENV_VARS["NODE_ENV"]="production"
ENV_VARS["NEXT_TELEMETRY_DISABLED"]="1"
ENV_VARS["DATABASE_URL"]="postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require"
ENV_VARS["DATABASE_PROVIDER"]="aiven"
ENV_VARS["DATABASE_SSL"]="true"
ENV_VARS["NODE_TLS_REJECT_UNAUTHORIZED"]="0"
ENV_VARS["NEXTAUTH_SECRET"]="holitime-super-secure-secret-key-for-production-2024"
ENV_VARS["NEXTAUTH_URL"]="https://holitime-369017734615.us-central1.run.app"
ENV_VARS["GOOGLE_CLIENT_ID"]="369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com"
ENV_VARS["GOOGLE_CLIENT_SECRET"]="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"
ENV_VARS["JWT_SECRET"]="holitime-jwt-secret-key-for-production-2024"
ENV_VARS["SMTP_HOST"]="smtp.gmail.com"
ENV_VARS["SMTP_PORT"]="587"
ENV_VARS["SMTP_USER"]="ryley92@gmail.com"
ENV_VARS["SMTP_PASS"]="bhxfntiblfatdlep"
ENV_VARS["GOOGLE_AI_API_KEY"]="AIzaSyDb8Qj6GKxUL1I2Stgv1B0gSTDOj0FB6k"
ENV_VARS["GOOGLE_API_KEY"]="AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ"
ENV_VARS["GEMINI_API_KEY"]="AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc"

# Cloud Run specific settings
MEMORY="4Gi"
CPU="4"
MIN_INSTANCES="0"
MAX_INSTANCES="2"
TIMEOUT="300" # seconds
CONCURRENCY="80"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Holitime deployment to Google Cloud Run${NC}"

# --- Setup and Prerequisites ---

# Check if required tools are installed
echo -e "${YELLOW}📋 Checking prerequisites (gcloud CLI)...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Authenticate with Google Cloud (if needed)
echo -e "${YELLOW}🔐 Checking Google Cloud authentication and project configuration...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔑 No active gcloud account found. Please authenticate...${NC}"
    gcloud auth login --no-launch-browser # Use --no-launch-browser for headless environments
    echo -e "${GREEN}✅ Authenticated${NC}"
fi

# Set the project
CURRENT_PROJECT=$(gcloud config get-value project)
if [[ -z "$CURRENT_PROJECT" || "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
    echo -e "${YELLOW}📝 Setting Google Cloud project to ${PROJECT_ID}...${NC}"
    gcloud config set project "${PROJECT_ID}"
    echo -e "${GREEN}✅ Project set${NC}"
else
    echo -e "${GREEN}✅ Project already set to ${PROJECT_ID}${NC}"
fi

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com || { echo -e "${RED}Failed to enable Cloud Build API.${NC}"; exit 1; }
gcloud services enable run.googleapis.com || { echo -e "${RED}Failed to enable Cloud Run API.${NC}"; exit 1; }
gcloud services enable artifactregistry.googleapis.com || { echo -e "${RED}Failed to enable Artifact Registry API.${NC}"; exit 1; }
echo -e "${GREEN}✅ APIs enabled${NC}"

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}📦 Ensuring Artifact Registry repository '${REPOSITORY_NAME}' exists in ${REGION}...${NC}"
if ! gcloud artifacts repositories describe ${REPOSITORY_NAME} --location=${REGION} --format="value(name)" &> /dev/null; then
    echo -e "${YELLOW}Creating Artifact Registry repository: ${REPOSITORY_NAME}${NC}"
    gcloud artifacts repositories create ${REPOSITORY_NAME} \
      --repository-format=docker \
      --location=${REGION} \
      --description="Docker images for Cloud Run services for ${SERVICE_NAME}"
    echo -e "${GREEN}✅ Artifact Registry repository created.${NC}"
else
    echo -e "${GREEN}✅ Artifact Registry repository '${REPOSITORY_NAME}' already exists.${NC}"
fi

# Check for Dockerfile
if [ ! -f Dockerfile ]; then
    echo -e "${RED}❌ Dockerfile not found in the current directory. Please create one.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile found.${NC}"

# --- Dynamically Generate cloudbuild.yaml ---

echo -e "${YELLOW}Generating Cloud Build configuration: ${CLOUDBUILD_CONFIG_FILE}...${NC}"

# Build the environment variables section for the YAML
ENV_VARS_YAML=""
for KEY in "${!ENV_VARS[@]}"; do
    VALUE="${ENV_VARS[$KEY]}"
    # Escape any special characters in the value for YAML
    ESCAPED_VALUE=$(printf '%s\n' "$VALUE" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ENV_VARS_YAML+="    ${KEY}: '${ESCAPED_VALUE}'\n"
done

cat <<EOF > "${CLOUDBUILD_CONFIG_FILE}"
# This file is dynamically generated by deploy.sh
# DO NOT EDIT MANUALLY if you intend to use the script for future deployments.

steps:
- name: 'gcr.io/cloud-builders/docker'
  id: 'Build and Tag Image'
  args: ['build', '-t', '${IMAGE_URL}', '.']

- name: 'gcr.io/cloud-builders/docker'
  id: 'Push Image to Registry'
  args: ['push', '${IMAGE_URL}']

- name: 'gcr.io/cloud-builders/gcloud'
  id: 'Deploy to Cloud Run'
  args:
  - 'run'
  - 'deploy'
  - '${SERVICE_NAME}'
  - '--image'
  - '${IMAGE_URL}'
  - '--platform'
  - 'managed'
  - '--region'
  - '${REGION}'
  - '--allow-unauthenticated'
  - '--port'
  - '3000'
  - '--memory'
  - '${MEMORY}'
  - '--cpu'
  - '${CPU}'
  - '--min-instances'
  - '${MIN_INSTANCES}'
  - '--max-instances'
  - '${MAX_INSTANCES}'
  - '--timeout'
  - '${TIMEOUT}'
  - '--concurrency'
  - '${CONCURRENCY}'
  - '--update-env-vars'
  - 'NODE_ENV=production'
  - '--update-env-vars'
  - 'NEXT_TELEMETRY_DISABLED=1'
  - '--update-env-vars'
  - 'DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require'
  - '--update-env-vars'
  - 'DATABASE_PROVIDER=aiven'
  - '--update-env-vars'
  - 'DATABASE_SSL=true'
  - '--update-env-vars'
  - 'NODE_TLS_REJECT_UNAUTHORIZED=0'
  - '--update-env-vars'
  - 'NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024'
  - '--update-env-vars'
  - 'NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app'
  - '--update-env-vars'
  - 'GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com'
  - '--update-env-vars'
  - 'GOOGLE_CLIENT_SECRET=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'
  - '--update-env-vars'
  - 'JWT_SECRET=holitime-jwt-secret-key-for-production-2024'
  - '--update-env-vars'
  - 'SMTP_HOST=smtp.gmail.com'
  - '--update-env-vars'
  - 'SMTP_PORT=587'
  - '--update-env-vars'
  - 'SMTP_USER=ryley92@gmail.com'
  - '--update-env-vars'
  - 'SMTP_PASS=bhxfntiblfatdlep'
  - '--update-env-vars'
  - 'GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2Stgv1B0gSTDOj0FB6k'
  - '--update-env-vars'
  - 'GOOGLE_API_KEY=AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ'
  - '--update-env-vars'
  - 'GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc'
  - '--project'
  - '${PROJECT_ID}'

# Define the images that will be built and pushed by this build
images:
- '${IMAGE_URL}'

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'

timeout: '1200s'
EOF

echo -e "${GREEN}✅ Cloud Build configuration generated.${NC}"
echo -e "${BLUE}You can inspect the generated file: ${CLOUDBUILD_CONFIG_FILE}${NC}"

# --- Trigger Cloud Build ---

echo -e "${YELLOW}🏗️  Submitting build to Google Cloud Build...${NC}"
echo -e "${BLUE}This will upload your source code and deploy to Cloud Run.${NC}"

# Cloud Build submission command
BUILD_COMMAND="gcloud builds submit --config ${CLOUDBUILD_CONFIG_FILE} . --project ${PROJECT_ID}"
echo -e "${BLUE}Executing: ${BUILD_COMMAND}${NC}"

# Execute Cloud Build, capture status
if ! eval "${BUILD_COMMAND}"; then
    echo -e "${RED}❌ Cloud Build failed!${NC}"
    echo -e "${RED}Please check the build logs in Google Cloud Console for details:${NC}"
    echo -e "${RED}https://console.cloud.google.com/cloud-build/builds;region=$REGION?project=$PROJECT_ID${NC}"
    rm -f "${CLOUDBUILD_CONFIG_FILE}" # Clean up temp file on failure
    exit 1
fi

echo -e "${GREEN}✅ Cloud Build completed successfully! Image built, pushed, and deployment initiated.${NC}"

# --- Post-Deployment Information ---

# Get the service URL
echo -e "${YELLOW}Retrieving Cloud Run service URL...${NC}"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Could not retrieve service URL. Deployment might still be in progress or failed unexpectedly.${NC}"
    echo -e "${RED}Check Cloud Run services in the console: https://console.cloud.google.com/run/services?project=${PROJECT_ID}®ion=${REGION}${NC}"
else
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your application is available at: ${SERVICE_URL}${NC}"
fi

echo -e "${YELLOW}📝 Important Considerations:${NC}"
echo -e "   1. ${RED}SECURITY WARNING:${NC} Sensitive variables like API keys, secrets, and passwords are currently hardcoded in the deployment script."
echo -e "      For production, it is STRONGLY recommended to store these in Google Cloud Secret Manager."
echo -e "   2. Ensure the Cloud Build service account has sufficient permissions to deploy to Cloud Run and push to Artifact Registry."

echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "   View Cloud Build history: gcloud builds list --project ${PROJECT_ID}"
echo -e "   View Cloud Run logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo -e "   Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
echo -e "   Delete service: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"

# Clean up the dynamically generated cloudbuild.yaml file
echo -e "${YELLOW}Cleaning up temporary Cloud Build config file: ${CLOUDBUILD_CONFIG_FILE}${NC}"
rm -f "${CLOUDBUILD_CONFIG_FILE}"
echo -e "${GREEN}Cleanup complete.${NC}"
echo -e "${BLUE}Deployment script finished.${NC}"
