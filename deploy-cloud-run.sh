#!/bin/bash

# Holitime Cloud Run Deployment Script (using Google Cloud Build)
# This script builds and deploys the Holitime application to Google Cloud Run via Cloud Build.

set -e  # Exit on any error

# --- Configuration ---
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"

# For Artifact Registry: us-central1-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY_NAME>/<SERVICE_NAME>
# Ensure REPOSITORY_NAME is unique and meaningful, e.g., 'cloud-run-images'
REPOSITORY_NAME="cloud-run-images"
# Tag with current timestamp for unique builds, or use 'latest' for simple overwrites
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)" # Example: holitime:20240423-143000
# Use a static tag like 'latest' if you want to deploy the most recent build consistently
# IMAGE_TAG="latest"

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"
CLOUDBUILD_CONFIG_FILE="cloudbuild_temp.yaml" # Temporary file for Cloud Build config

# Define all environment variables in an associative array
# This makes it easy to add/remove and correctly format them for the YAML.
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
MEMORY="2Gi"
CPU="1"
MIN_INSTANCES="0"
MAX_INSTANCES="1"
TIMEOUT="300" # seconds
CONCURRENCY="100"

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
    echo "A recommended Dockerfile structure can be found in the script's comments."
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile found.${NC}"

# --- Dynamically Generate cloudbuild.yaml ---

echo -e "${YELLOW}Generating Cloud Build configuration: ${CLOUDBUILD_CONFIG_FILE}...${NC}"

# Build the --set-env-vars string for cloudbuild.yaml
ENV_VARS_STRING=""
for KEY in "${!ENV_VARS[@]}"; do
    VALUE="${ENV_VARS[$KEY]}"
    # Escape double quotes inside the value for YAML parsing
    ESCAPED_VALUE=$(echo "$VALUE" | sed 's/"/\\"/g')
    ENV_VARS_STRING+="\"${KEY}=${ESCAPED_VALUE}\","
done
# Remove trailing comma
ENV_VARS_STRING=${ENV_VARS_STRING%,}

cat <<EOF > "${CLOUDBUILD_CONFIG_FILE}"
# This file is dynamically generated by deploy.sh
# DO NOT EDIT MANUALLY if you intend to use the script for future deployments.
# To customize deployment, modify the deploy.sh script directly.

steps:
- name: 'gcr.io/cloud-builders/docker'
  id: 'Build and Tag Image'
  args: ['build', '-t', '${_IMAGE_URL}', '.']

- name: 'gcr.io/cloud-builders/docker'
  id: 'Push Image to Registry'
  args: ['push', '${_IMAGE_URL}']

- name: 'gcr.io/cloud-builders/gcloud'
  id: 'Deploy to Cloud Run'
  args:
  - 'run'
  - 'deploy'
  - '${_SERVICE_NAME}'
  - '--image'
  - '${_IMAGE_URL}'
  - '--platform'
  - 'managed'
  - '--region'
  - '${_REGION}'
  - '--allow-unauthenticated'
  - '--port'
  - '3000'
  - '--memory'
  - '${_MEMORY}'
  - '--cpu'
  - '${_CPU}'
  - '--min-instances'
  - '${_MIN_INSTANCES}'
  - '--max-instances'
  - '${_MAX_INSTANCES}'
  - '--timeout'
  - '${_TIMEOUT}'
  - '--concurrency'
  - '${_CONCURRENCY}'
  - '--set-env-vars'
  - "${ENV_VARS_STRING}" # IMPORTANT: This entire string must be on one line in the YAML
  - '--project'
  - '${PROJECT_ID}'

# Define the images that will be built and pushed by this build
images:
- '${_IMAGE_URL}'

# Substitution variables allow you to make the build more flexible
# without modifying the core cloudbuild.yaml file.
# PROJECT_ID is automatically provided by Cloud Build.
substitutions:
  _SERVICE_NAME: ${SERVICE_NAME}
  _REGION: ${REGION}
  _IMAGE_URL: ${IMAGE_URL}
  _MEMORY: ${MEMORY}
  _CPU: ${CPU}
  _MIN_INSTANCES: ${MIN_INSTANCES}
  _MAX_INSTANCES: ${MAX_INSTANCES}
  _TIMEOUT: ${TIMEOUT}
  _CONCURRENCY: ${CONCURRENCY}
EOF

echo -e "${GREEN}✅ Cloud Build configuration generated.${NC}"
echo -e "${BLUE}You can inspect the generated file: ${CLOUDBUILD_CONFIG_FILE}${NC}"

# --- Trigger Cloud Build ---

echo -e "${YELLOW}🏗️  Submitting build to Google Cloud Build...${NC}"
echo -e "${BLUE}This will upload your source code (respecting .dockerignore and .gcloudignore) and the generated ${CLOUDBUILD_CONFIG_FILE} to Cloud Build.${NC}"
echo -e "${BLUE}Cloud Build will then build your Docker image, push it to Artifact Registry, and deploy to Cloud Run.${NC}"

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
echo -e "   1. ${RED}SECURITY WARNING:${NC} Sensitive variables like API keys, secrets, and passwords (e.g., SMTP_PASS, NEXTAUTH_SECRET, JWT_SECRET) are currently hardcoded in the deployment script."
echo -e "      For production, it is STRONGLY recommended to store these in Google Cloud Secret Manager and reference them in Cloud Run."
echo -e "      Learn more: https://cloud.google.com/run/docs/configuring/secrets"
echo -e "      Example Secret Manager reference in cloudbuild.yaml (in --set-env-vars):"
echo -e "      - \"MY_SECRET_VAR=projects/\$\$PROJECT_NUMBER/secrets/my-secret-name/versions/latest\""
echo -e "      (Note: \$\$PROJECT_NUMBER is a special Cloud Build variable. You'd need to replace the hardcoded values in ENV_VARS with these references if using Secret Manager.)"
echo -e "   2. Ensure the Cloud Build service account (usually 'PROJECT_NUMBER@cloudbuild.gserviceaccount.com') has sufficient permissions to deploy to Cloud Run (roles/run.admin or custom role) and push to Artifact Registry (roles/artifactregistry.writer)."

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