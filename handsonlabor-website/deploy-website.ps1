# Handsonlabor Website Cloud Run Deployment Script (PowerShell)
# This script builds and deploys the handsonlabor-website to Google Cloud Run

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "handsonlabor",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "handsonlabor-website",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1"
)

# Configuration
$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "Starting Handsonlabor Website deployment to Google Cloud Run" -ForegroundColor Blue

# Check if required tools are installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check for gcloud
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "Google Cloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "Google Cloud CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check for docker
try {
    $null = Get-Command docker -ErrorAction Stop
    Write-Host "Docker found" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://docs.docker.com/get-docker/"
    exit 1
}

Write-Host "Prerequisites check passed" -ForegroundColor Green

# Set the project
Write-Host "Setting Google Cloud project to $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set project" -ForegroundColor Red
    exit 1
}

# Enable required APIs
Write-Host "Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to enable APIs" -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "Building Next.js application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully" -ForegroundColor Green

# Build Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Docker image built successfully" -ForegroundColor Green

# Push to Google Container Registry
Write-Host "Pushing image to Google Container Registry..." -ForegroundColor Yellow
docker push $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push image" -ForegroundColor Red
    exit 1
}

Write-Host "Image pushed successfully" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image $ImageName `
  --platform managed `
  --region $Region `
  --allow-unauthenticated `
  --port 3000 `
  --memory 1Gi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --timeout 300 `
  --concurrency 80 `
  --set-env-vars "NODE_ENV=production" `
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green

# Get the service URL
$serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan

Write-Host "Handsonlabor Website deployment completed!" -ForegroundColor Green
Write-Host "Visit your website at: $serviceUrl" -ForegroundColor Cyan
