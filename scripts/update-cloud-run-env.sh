#!/bin/bash

# Quick script to update Cloud Run environment variables without rebuilding
# This adds the missing GOOGLE_AI_API_KEY and other environment variables

set -e

# Configuration
PROJECT_ID="handsonlabor"
SERVICE_NAME="holitime"
REGION="us-central1"

echo "🔧 Updating Cloud Run environment variables for ${SERVICE_NAME}..."

# Set the project
gcloud config set project ${PROJECT_ID}

# Update the service with new environment variables
echo "📝 Adding missing environment variables..."

gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --update-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" \
  --update-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" \
  --update-env-vars "SMTP_HOST=smtp.gmail.com" \
  --update-env-vars "SMTP_PORT=587" \
  --update-env-vars "SMTP_USER=ryley92@gmail.com" \
  --update-env-vars "SMTP_PASS=HdfatbOY123!!!!"

echo "✅ Environment variables updated successfully!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo "🌐 Service URL: ${SERVICE_URL}"
echo "📋 Updated environment variables:"
echo "   - GOOGLE_AI_API_KEY (for Gemini AI)"
echo "   - GEMINI_API_KEY (for Gemini AI)"
echo "   - SMTP_HOST (for email notifications)"
echo "   - SMTP_PORT (for email notifications)"
echo "   - SMTP_USER (for email notifications)"
echo "   - SMTP_PASS (for email notifications)"

echo ""
echo "🚀 The data import should now work with Gemini AI configured!"
echo "📝 You can verify the environment variables in the Cloud Run console:"
echo "   https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/variables?project=${PROJECT_ID}"
