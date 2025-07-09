#!/bin/bash

# SUPER FAST Holitime Cloud Run Deployment Script
# Uses Cloud Build for faster deployment

set -e  # Exit on any error

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 FAST Holitime deployment to Google Cloud Run${NC}"

# Quick checks
echo -e "${YELLOW}📋 Quick checks...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud not found${NC}"
    exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID} --quiet

# Enable APIs (only if needed)
echo -e "${YELLOW}🔧 Enabling APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com --quiet

# Check build context size
echo -e "${YELLOW}📏 Checking build context size...${NC}"
BUILD_SIZE=$(find . -type f ! -path './.git/*' ! -path './node_modules/*' ! -path './.next/*' ! -path './handsonlabor-website/*' | wc -l)
echo -e "${BLUE}Files to upload: ${BUILD_SIZE}${NC}"

if [ "$BUILD_SIZE" -gt 1000 ]; then
    echo -e "${YELLOW}⚠️  Large build context detected. This might take longer.${NC}"
fi

# Use Cloud Build for faster building with simple Dockerfile
echo -e "${YELLOW}🏗️  Building with Cloud Build (using simple Dockerfile)...${NC}"
cp Dockerfile.simple Dockerfile
gcloud builds submit \
  --tag ${IMAGE_NAME} \
  --timeout=600s \
  --machine-type=e2-highcpu-8 \
  --quiet

# Deploy to Cloud Run with environment variables
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 300 \
  --concurrency 100 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3595fcb-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require" \
  --set-env-vars "DATABASE_PROVIDER=aiven" \
  --set-env-vars "DATABASE_SSL=true" \
  --set-env-vars "NODE_TLS_REJECT_UNAUTHORIZED=0" \
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" \
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" \
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" \
  --set-env-vars "GOOGLE_API_KEY=AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ" \
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024" \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \
  --set-env-vars "SMTP_PASS=HdfatbOY123!!!" \
  --quiet

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)' 2>/dev/null)

echo -e "${GREEN}🎉 FAST deployment completed!${NC}"
echo -e "${GREEN}🌐 URL: ${SERVICE_URL}${NC}"
echo -e "${BLUE}📊 View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}${NC}"
