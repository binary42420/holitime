#!/bin/bash

# Handsonlabor Website Cloud Run Deployment Script
# This script builds and deploys the Handsonlabor Website to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="handsonlabor-website"
REGION="us-central1"
REPOSITORY="cloud-run-source-deploy"
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"

# Colors for output
RED='
033[0;31m'
GREEN='
033[0;32m'
YELLOW='
033[1;33m'
BLUE='
033[0;34m'
NC='
033[0m' # No Color

echo -e "${BLUE}🚀 Starting Handsonlabor Website deployment to Google Cloud Run${NC}"

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

# Build the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

# Push the image to Google Artifact Registry
echo -e "${YELLOW}📤 Pushing image to Google Artifact Registry...${NC}"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is available at: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo -e "   1. Set up your environment variables in Cloud Run console (if any)"
echo -e "   2. Set up your domain (if needed)"

echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "   View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo -e "   Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
echo -e "   Delete service: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"
