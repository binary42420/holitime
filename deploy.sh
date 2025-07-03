#!/bin/bash
# deploy.sh

set -e

PROJECT_ID="handsonlabor"
REGION="us"
REPOSITORY="gcr.io"
IMAGE_NAME="holitime-app"
TAG="latest"

# Full image URL
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

echo "🔧 Configuring Docker authentication..."
gcloud auth configure-docker us-docker.pkg.dev

echo "🏗️ Building Docker image..."
docker build -t ${IMAGE_NAME}:${TAG} .

echo "🏷️ Tagging image for Artifact Registry..."
docker tag ${IMAGE_NAME}:${TAG} ${IMAGE_URL}

echo "📤 Pushing to Artifact Registry..."
docker push ${IMAGE_URL}

echo "✅ Image pushed successfully!"
echo "📍 Image URL: ${IMAGE_URL}"