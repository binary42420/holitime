


# PowerShell script for deploying to Cloud Run on Windows

param(
  [string]$ProjectId = "your-gcp-project-id",
  [string]$Region = "us-central1",
  [string]$ServiceName = "holitime"
)

# Generate image tag with timestamp
$imageTag = "$(Get-Date -Format 'yyyyMMddHHmmss')"
$imageName = "gcr.io/${ProjectId}/${ServiceName}:$imageTag"

Write-Host "Running standard Next.js build..."
npm run build

Write-Host "Building Docker image $imageName..."
docker build -t $imageName .

Write-Host "Pushing Docker image to Google Container Registry..."
docker push $imageName


Write-Host "Deploying to Cloud Run service $ServiceName in region $Region..."
gcloud run deploy $ServiceName `
  --image $imageName `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 3000 `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 10 `
  --set-env-vars "NODE_ENV=production,DATABASE_URL=$env:DATABASE_URL,DATABASE_PROVIDER=aiven,DATABASE_SSL=true,NODE_TLS_REJECT_UNAUTHORIZED=0,NEXTAUTH_SECRET=$env:NEXTAUTH_SECRET,NEXTAUTH_URL=http://$ServiceName.$Region.run"

Write-Host "Deployment complete."
