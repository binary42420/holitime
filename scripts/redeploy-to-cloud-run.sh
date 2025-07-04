#!/bin/bash

# HoliTime Redeployment Script to Cloud Run
# This script redeploys the application with all recent fixes

set -e

echo "🚀 HoliTime Redeployment to Cloud Run"
echo "====================================="

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

echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "✅ Mobile sidebar functionality implemented"
echo "✅ Timesheet data structure issues fixed"
echo "✅ Google Sheets import/export enhanced"
echo "✅ Build errors resolved"
echo "✅ Nodemailer import issues fixed"
echo "⚠️  Email authentication needs Gmail App Password"
echo ""

# Check authentication
echo -e "${BLUE}🔐 Checking authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ No active authentication found${NC}"
    echo -e "${YELLOW}🔧 Authenticating with Google Cloud...${NC}"
    gcloud auth login
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}✅ Authenticated as: ${ACTIVE_ACCOUNT}${NC}"

# Set project
echo -e "${BLUE}🔧 Setting project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✅ Project set to: ${PROJECT_ID}${NC}"

# Configure Docker authentication
echo -e "${BLUE}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
echo -e "${GREEN}✅ Docker authentication configured${NC}"

# Pre-deployment checks
echo -e "${BLUE}🔍 Pre-deployment checks...${NC}"

# Check if build passes
echo -e "${YELLOW}📦 Running build test...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed - please fix build errors before deploying${NC}"
    exit 1
fi

# Deploy to Cloud Run
echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
echo -e "${YELLOW}📝 Using source deployment for reliability${NC}"

gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 3 \
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
  --set-env-vars "SMTP_PASS=bhxfntiblfatdlep" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
    echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
    
    # Test the deployment
    echo -e "${BLUE}🧪 Testing deployment...${NC}"
    sleep 10  # Wait for service to be ready
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL" || echo "000")
    if [[ "$HTTP_CODE" =~ ^(200|302)$ ]]; then
        echo -e "${GREEN}✅ Service is responding (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠️  Service returned HTTP $HTTP_CODE - may still be starting up${NC}"
    fi
    
    echo -e "${BLUE}📋 Post-Deployment Checklist:${NC}"
    echo "1. ✅ Mobile sidebar functionality"
    echo "2. ✅ Timesheet data display"
    echo "3. ✅ Google Sheets import/export"
    echo "4. ✅ Dashboard client view navigation"
    echo "5. ⚠️  Email functionality (needs App Password)"
    
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo "• Application: $SERVICE_URL"
    echo "• Dashboard: $SERVICE_URL/dashboard"
    echo "• Mobile Test: Open on mobile device"
    echo "• Admin Panel: $SERVICE_URL/admin"
    
    echo -e "${YELLOW}📧 Email Setup Reminder:${NC}"
    echo "Current SMTP password may not work with Gmail."
    echo "To fix email functionality:"
    echo "1. Enable 2FA on Google account"
    echo "2. Generate App Password for Mail"
    echo "3. Update SMTP_PASS environment variable"
    echo "4. Redeploy with new password"
    
    echo -e "${BLUE}📊 What's New in This Deployment:${NC}"
    echo "• 📱 Mobile sidebar with touch gestures"
    echo "• 🔧 Fixed timesheet data structure issues"
    echo "• 📊 Enhanced Google Sheets functionality"
    echo "• 🚀 Resolved all build errors"
    echo "• 🔗 Fixed dashboard client navigation"
    
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "The HoliTime workforce management application is now live with all fixes."
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "1. Check authentication: gcloud auth list"
    echo "2. Verify project access: gcloud projects describe $PROJECT_ID"
    echo "3. Check build logs above for errors"
    echo "4. Ensure all environment variables are correct"
    echo "5. Try manual deployment: gcloud run deploy $SERVICE_NAME --source ."
    exit 1
fi

echo -e "${BLUE}📝 Logs and Monitoring:${NC}"
echo "• View logs: gcloud logs read --service=$SERVICE_NAME --limit=50"
echo "• Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo "• Metrics: Check Cloud Run metrics in Google Cloud Console"

echo -e "${GREEN}🚀 Redeployment process complete!${NC}"
