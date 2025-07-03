#!/bin/bash

# Fix Docker credentials and deploy to Cloud Run
set -e

echo "🔧 Fixing Docker credentials and deploying to Cloud Run..."

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"

echo "📋 Step 1: Fixing Docker authentication..."

# Clear any existing Docker credentials
docker logout || true

# Re-authenticate with Google Cloud
echo "🔑 Re-authenticating with Google Cloud..."
gcloud auth login --no-launch-browser

# Set the project
gcloud config set project ${PROJECT_ID}

# Configure Docker authentication for Artifact Registry
echo "🐳 Configuring Docker for Artifact Registry..."
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

# Alternative: Use gcloud credential helper
echo "🔧 Setting up gcloud credential helper..."
gcloud auth configure-docker --quiet

echo "📋 Step 2: Building and deploying with Cloud Build..."

# Use Cloud Build instead of local Docker build to avoid credential issues
echo "🏗️  Deploying with Cloud Build (bypasses local Docker issues)..."

# Deploy using Cloud Build
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \
  --set-env-vars "DATABASE_URL=postgresql://avnadmin:AVNS_lzlJVgKhBOJOQNJhJGJJJJJ@pg-handsonlabor-handsonlabor.h.aivencloud.com:13039/defaultdb?sslmode=require" \
  --set-env-vars "DATABASE_PROVIDER=aiven" \
  --set-env-vars "DATABASE_SSL=true" \
  --set-env-vars "GOOGLE_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --set-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \
  --set-env-vars "SMTP_PASS=HdfatbOY123!!!!" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"

echo "✅ Deployment completed!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📋 What was fixed:"
echo "  ✅ Docker credential issues resolved"
echo "  ✅ Using Cloud Build instead of local Docker"
echo "  ✅ All environment variables configured"
echo "  ✅ Google Sheets import should now work"
echo ""
echo "📝 Next steps:"
echo "  1. Test the Google Sheets import feature"
echo "  2. Verify all functionality is working"
echo "  3. Check logs if any issues persist"
echo ""
echo "🔍 Useful commands:"
echo "  View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo "  Update service: gcloud run services update ${SERVICE_NAME} --region ${REGION}"
