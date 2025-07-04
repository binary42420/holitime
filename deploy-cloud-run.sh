#!/bin/bash

# Holitime Cloud Run Deployment Script (using Google Cloud Build)
# This script builds and deploys the Holitime application to Google Cloud Run via Cloud Build.

set -e  # Exit on any error

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"  # Change to your preferred region

# For Artifact Registry: us-central1-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY_NAME>/<IMAGE_NAME>
# Ensure this REPOSITORY_NAME is unique and meaningful, e.g., 'cloud-run-images'
REPOSITORY_NAME="cloud-run-images"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Holitime deployment to Google Cloud Run${NC}"

# Check if required tools are installed
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Docker is not strictly required on local machine for Cloud Build, but useful for local testing.
# Keeping this check as a soft recommendation.
# if ! command -v docker &> /dev/null; then
#     echo -e "${YELLOW}⚠️  Docker is not installed. Not strictly required for Cloud Build, but useful for local development.${NC}"
#     echo "Visit: https://docs.docker.com/get-docker/"
# fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Authenticate with Google Cloud (if needed)
echo -e "${YELLOW}🔐 Checking Google Cloud authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔑 Please authenticate with Google Cloud...${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${YELLOW}📝 Setting Google Cloud project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com || true # Use || true to prevent script from exiting if already enabled
gcloud services enable run.googleapis.com || true
gcloud services enable artifactregistry.googleapis.com || true

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}📦 Ensuring Artifact Registry repository '${REPOSITORY_NAME}' exists in ${REGION}...${NC}"
if ! gcloud artifacts repositories describe ${REPOSITORY_NAME} --location=${REGION} --format="value(name)" &> /dev/null; then
    echo -e "${YELLOW}Creating Artifact Registry repository: ${REPOSITORY_NAME}${NC}"
    gcloud artifacts repositories create ${REPOSITORY_NAME} \
      --repository-format=docker \
      --location=${REGION} \
      --description="Docker images for Cloud Run services"
else
    echo -e "${GREEN}✅ Artifact Registry repository '${REPOSITORY_NAME}' already exists.${NC}"
fi

# --- CORE CHANGE: Use gcloud builds submit for the build and push ---
echo -e "${YELLOW}🏗️  Building Docker image using Google Cloud Build...${NC}"
echo -e "${BLUE}This will upload your source code (respecting .dockerignore and .gcloudignore) to Cloud Build, build the image, and push it to Artifact Registry.${NC}"

# The '.' at the end means "use the current directory as source context"
# Cloud Build will find your Dockerfile and build it.
gcloud builds submit \
  --tag ${IMAGE_NAME} .

echo -e "${GREEN}✅ Image built and pushed to Artifact Registry: ${IMAGE_NAME}${NC}"

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run with command: ${NC}"
# Print the command for user's reference, but use variables for execution
echo -e "${BLUE}gcloud run deploy ${SERVICE_NAME} \n\
  --image ${IMAGE_NAME} \n\
  --platform managed \n\
  --region ${REGION} \n\
  --allow-unauthenticated \n\
  --port 3000 \n\
  --memory 2Gi \n\
  --cpu 2 \n\
  --min-instances 0 \n\
  --max-instances 1 \n\
  --timeout 300 \n\
  --concurrency 80 \n\
  --set-env-vars "NODE_ENV=production" \n\
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \n\
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require" \n\
  --set-env-vars "DATABASE_PROVIDER=aiven" \n\
  --set-env-vars "DATABASE_SSL=true" \n\
  --set-env-vars "NODE_TLS_REJECT_UNAUTHORIZED=0" \n\
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" \n\
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" \n\
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" \n\
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" \n\
  --set-env-vars "GOOGLE_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \n\
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \n\
  --set-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" \n\
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \n\
  --set-env-vars "SMTP_PORT=587" \n\
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \n\
  --set-env-vars "SMTP_PASS=HdfatbOY123!!!!" \n\
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"${NC}"

gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --memory 4Gi \
  --cpu 4 \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require" \
  --set-env-vars "DATABASE_PROVIDER=aiven" \
  --set-env-vars "DATABASE_SSL=true" \
  --set-env-vars "NODE_TLS_REJECT_UNAUTHORIZED=0" \
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" \
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" \
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" \
  --set-env-vars "GOOGLE_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \
  --set-env-vars "SMTP_PASS=bhxfntiblfatdlep" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is available at: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}📝 Important Considerations:${NC}"
echo -e "   1. ${RED}SECURITY WARNING:${NC} Sensitive variables like API keys, secrets, and passwords (e.g., SMTP_PASS, NEXTAUTH_SECRET, JWT_SECRET) are currently hardcoded."
echo -e "      For production, it is STRONGLY recommended to store these in Google Cloud Secret Manager and reference them in Cloud Run."
echo -e "      Learn more: https://cloud.google.com/run/docs/configuring/secrets"
echo -e "   2. Configure your database connection (already done via DATABASE_URL)."
echo -e "   3. Set up your custom domain (if needed)."

echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "   View Cloud Build history: gcloud builds list --project ${PROJECT_ID}"
echo -e "   View Cloud Run logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo -e "   Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
echo -e "   Delete service: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"