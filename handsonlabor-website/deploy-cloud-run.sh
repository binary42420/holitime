#!/bin/bash

# Set variables
PROJECT_ID=handsonlabor
REGION=us-central1
SERVICE_NAME=holitime
IMAGE=gcr.io/$PROJECT_ID/holitime:\$(date +%Y%m%d%H%M%S)

# Run standard Next.js build (not Capacitor build)
npm run build

# Build Docker image
docker build -t $IMAGE .

# Push Docker image
docker push $IMAGE

# Deploy to Cloud Run with full environment variables
gcloud run deploy $SERVICE_NAME \\
  --image $IMAGE \\
  --region $REGION \\
  --platform managed \\
  --allow-unauthenticated \\
  --port 3000 \\
  --memory 1Gi \\
  --cpu 1 \\
  --max-instances 1 \\
  --set-env-vars NODE_ENV=production,DATABASE_URL=$DATABASE_URL,DATABASE_PROVIDER=aiven,DATABASE_SSL=true,NODE_TLS_REJECT_UNAUTHORIZED=0,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,NEXTAUTH_URL=http://$SERVICE_NAME.$REGION.run
