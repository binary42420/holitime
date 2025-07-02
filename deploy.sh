#!/bin/bash

# Holitime Deployment Script for Google Cloud Platform
# This script deploys the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"handsonlabor"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
SERVICE_NAME="holitime"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo -e "${BLUE}🚀 Starting deployment of Holitime to Google Cloud Platform${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Please run: gcloud auth login${NC}"
    exit 1
fi

# Set the project
echo -e "${BLUE}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
echo -e "${BLUE}🏗️  Building Docker image...${NC}"
docker build -t $IMAGE_NAME:latest .

echo -e "${BLUE}📤 Pushing image to Google Container Registry...${NC}"
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 1 \
    --set-env-vars "NODE_ENV=production,DATABASE_PROVIDER=aiven,DATABASE_SSL=true,NODE_TLS_REJECT_UNAUTHORIZED=0"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is available at: $SERVICE_URL${NC}"
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo -e "${YELLOW}   1. Set up your environment variables in Google Cloud Console${NC}"
echo -e "${YELLOW}   2. Configure your Google OAuth credentials${NC}"
echo -e "${YELLOW}   3. Update your database connection settings${NC}"
echo -e "${YELLOW}   4. Set up your custom domain (optional)${NC}"
