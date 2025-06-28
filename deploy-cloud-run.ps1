# Holitime Cloud Run Deployment Script (PowerShell)
# This script builds and deploys the Holitime application to Google Cloud Run

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "holitime",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1"
)

# Configuration
$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "🚀 Starting Holitime deployment to Google Cloud Run" -ForegroundColor Blue

# Check if required tools are installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check for gcloud
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "✅ Google Cloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check for docker
try {
    $null = Get-Command docker -ErrorAction Stop
    Write-Host "✅ Docker found" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://docs.docker.com/get-docker/"
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Authenticate with Google Cloud (if needed)
Write-Host "🔐 Checking Google Cloud authentication..." -ForegroundColor Yellow
$activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $activeAccount) {
    Write-Host "🔑 Please authenticate with Google Cloud..." -ForegroundColor Yellow
    gcloud auth login
}

# Set the project
Write-Host "📝 Setting Google Cloud project to $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host "🔧 Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Configure Docker to use gcloud as a credential helper
Write-Host "🐳 Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker

# Build the Docker image
Write-Host "🏗️  Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

# Push the image to Google Container Registry
Write-Host "📤 Pushing image to Google Container Registry..." -ForegroundColor Yellow
docker push $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
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
    Write-Host "❌ Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

# Get the service URL
$ServiceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format 'value(status.url)'

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Your application is available at: $ServiceUrl" -ForegroundColor Green
Write-Host "📝 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Set up your environment variables in Cloud Run console"
Write-Host "   2. Configure your database connection"
Write-Host "   3. Set up your domain (if needed)"
Write-Host "   4. Configure authentication secrets"

Write-Host "📊 Useful commands:" -ForegroundColor Blue
Write-Host "   View logs: gcloud run services logs tail $ServiceName --region $Region"
Write-Host "   Update service: gcloud run services update $ServiceName --region $Region"
Write-Host "   Delete service: gcloud run services delete $ServiceName --region $Region"
