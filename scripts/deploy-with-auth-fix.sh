#!/bin/bash

# HoliTime Deployment Script with Authentication Fix
# This script handles common Google Cloud authentication issues

set -e

echo "🚀 HoliTime Deployment with Authentication Fix"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"

echo -e "${BLUE}📋 Checking authentication status...${NC}"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ No active authentication found${NC}"
    echo -e "${YELLOW}🔧 Please authenticate with Google Cloud:${NC}"
    echo "gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}✅ Authenticated as: ${ACTIVE_ACCOUNT}${NC}"

# Check current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Setting project to ${PROJECT_ID}${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}✅ Project set to: ${PROJECT_ID}${NC}"

# Check if we can access the project
if ! gcloud projects describe $PROJECT_ID >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot access project ${PROJECT_ID}${NC}"
    echo -e "${YELLOW}💡 Make sure you have access to the project${NC}"
    exit 1
fi

# Configure Docker authentication
echo -e "${BLUE}🔧 Configuring Docker authentication...${NC}"
if gcloud auth configure-docker us-central1-docker.pkg.dev --quiet; then
    echo -e "${GREEN}✅ Docker authentication configured${NC}"
else
    echo -e "${YELLOW}⚠️  Docker authentication failed, but continuing...${NC}"
fi

# Check if Artifact Registry exists
echo -e "${BLUE}🔍 Checking Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe cloud-run-source-deploy --location=$REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Artifact Registry not found, will be created during deployment${NC}"
fi

# Deploy using source (bypasses registry issues)
echo -e "${BLUE}🚀 Deploying from source...${NC}"
echo -e "${YELLOW}📝 Note: Using source deployment to bypass registry authentication issues${NC}"

# Gmail App Password reminder
echo -e "${YELLOW}📧 Email Setup Reminder:${NC}"
echo "If you haven't set up Gmail App Password yet:"
echo "1. Enable 2FA on your Google account"
echo "2. Generate App Password for Mail"
echo "3. Replace SMTP_PASS below with the 16-character password"
echo ""

# Deployment command
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
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
  --set-env-vars "GOOGLE_API_KEY=AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ" \
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \
  --set-env-vars "SMTP_PASS=bhxfntiblfatdlepdfatbOY123!!!" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
    echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
    
    # Test the deployment
    echo -e "${BLUE}🧪 Testing deployment...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL" | grep -q "200\|302"; then
        echo -e "${GREEN}✅ Service is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Service might be starting up, check logs if issues persist${NC}"
    fi
    
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Visit: $SERVICE_URL"
    echo "2. Test email functionality: $SERVICE_URL/api/test-email"
    echo "3. Check logs: gcloud logs read --service=$SERVICE_NAME --limit=50"
    
    if [[ "$SMTP_PASS" == "HdfatbOY123!!!" ]]; then
        echo -e "${YELLOW}📧 Email Setup Required:${NC}"
        echo "Your current SMTP password may not work with Gmail."
        echo "Set up Gmail App Password for reliable email delivery."
    fi
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "1. Check authentication: gcloud auth list"
    echo "2. Verify project access: gcloud projects describe $PROJECT_ID"
    echo "3. Check IAM permissions for Artifact Registry and Cloud Run"
    echo "4. Try manual authentication: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment process complete!${NC}"
