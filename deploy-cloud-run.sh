#!/bin/bash

# Holitime Cloud Run Deployment Script
# This script builds and deploys the Holitime application to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"  # Change to your preferred region
REPOSITORY="cloud-run-source-deploy"
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"

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

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

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
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker us-central1-docker.pkg.dev

# Clean up Docker to free space
echo -e "${YELLOW}🧹 Cleaning up Docker...${NC}"
docker system prune -f

# Build the Docker image with optimizations
echo -e "${YELLOW}🏗️  Building Docker image with optimizations...${NC}"
echo -e "${BLUE}Build context size:${NC}"
du -sh . | head -1

# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker build \
  --progress=plain \
  --no-cache \
  -t ${IMAGE_NAME} .

# Push the image to Google Artifact Registry
echo -e "${YELLOW}📤 Pushing image to Google Artifact Registry...${NC}"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run with command: \n
gcloud run deploy ${SERVICE_NAME} \n
  --image ${IMAGE_NAME} \n
  --platform managed \n
  --region ${REGION} \n
  --allow-unauthenticated \n
  --port 3000 \n
  --memory 2Gi \n
  --cpu 2 \n
  --min-instances 0 \n
  --max-instances 1 \n
  --timeout 300 \n
  --concurrency 80 \n
  --set-env-vars "NODE_ENV=production" \n
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \n
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require" \n
  --set-env-vars "DATABASE_PROVIDER=aiven" \n
  --set-env-vars "DATABASE_SSL=true" \n
  --set-env-vars "NODE_TLS_REJECT_UNAUTHORIZED=0" \n
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" \n
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" \n
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" \n
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" \n
  --set-env-vars "GOOGLE_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \n
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024" \n
${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 1 \
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
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is available at: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo -e "   1. Set up your environment variables in Cloud Run console"
echo -e "   2. Configure your database connection"
echo -e "   3. Set up your domain (if needed)"
echo -e "   4. Configure authentication secrets"

echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "   View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo -e "   Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
echo -e "   Delete service: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"
