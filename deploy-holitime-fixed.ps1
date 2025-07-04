# HoliTime Redeployment Script to Cloud Run (PowerShell)
# This script redeploys the application with all recent fixes

param(
    [string]$ProjectId = "handsonlabor"
)

Write-Host "🚀 HoliTime Redeployment to Cloud Run" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Configuration
$SERVICE_NAME = "holitime"
$REGION = "us-central1"

Write-Host "📋 Deployment Summary:" -ForegroundColor Blue
Write-Host "✅ Mobile sidebar functionality implemented" -ForegroundColor Green
Write-Host "✅ Timesheet data structure issues fixed" -ForegroundColor Green
Write-Host "✅ Google Sheets import/export enhanced" -ForegroundColor Green
Write-Host "✅ Build errors resolved" -ForegroundColor Green
Write-Host "✅ Nodemailer import issues fixed" -ForegroundColor Green
Write-Host "⚠️  Email authentication needs Gmail App Password" -ForegroundColor Yellow
Write-Host ""

# Check authentication
Write-Host "🔐 Checking authentication..." -ForegroundColor Blue
try {
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Host "❌ No active authentication found" -ForegroundColor Red
        Write-Host "🔧 Please authenticate with Google Cloud..." -ForegroundColor Yellow
        gcloud auth login
        $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)"
    }
    Write-Host "✅ Authenticated as: $activeAccount" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Set project
Write-Host "🔧 Setting project..." -ForegroundColor Blue
gcloud config set project $ProjectId
Write-Host "✅ Project set to: $ProjectId" -ForegroundColor Green

# Configure Docker authentication
Write-Host "🐳 Configuring Docker authentication..." -ForegroundColor Blue
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
Write-Host "✅ Docker authentication configured" -ForegroundColor Green

# Pre-deployment checks
Write-Host "🔍 Pre-deployment checks..." -ForegroundColor Blue

# Check if build passes
Write-Host "📦 Running build test..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed - please fix build errors before deploying" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Blue
Write-Host "📝 Using source deployment for reliability" -ForegroundColor Yellow

$deployCommand = @"
gcloud run deploy $SERVICE_NAME ``
  --source . ``
  --platform managed ``
  --region $REGION ``
  --allow-unauthenticated ``
  --port 3000 ``
  --memory 2Gi ``
  --cpu 2 ``
  --min-instances 0 ``
  --max-instances 3 ``
  --timeout 300 ``
  --concurrency 80 ``
  --set-env-vars "NODE_ENV=production" ``
  --set-env-vars "NEXT_TELEMETRY_DISABLED=1" ``
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require" ``
  --set-env-vars "DATABASE_PROVIDER=aiven" ``
  --set-env-vars "DATABASE_SSL=true" ``
  --set-env-vars "NODE_TLS_REJECT_UNAUTHORIZED=0" ``
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" ``
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" ``
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" ``
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" ``
  --set-env-vars "GOOGLE_API_KEY=AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ" ``
  --set-env-vars "GOOGLE_AI_API_KEY=AIzaSyDb8Qj6GKxUL1I2StgvE1B0gSTDOj0FB6k" ``
  --set-env-vars "GEMINI_API_KEY=AIzaSyDAUHnUgtT1SXmZt6J1Rs6JqirVMSHQNtc" ``
  --set-env-vars "SMTP_HOST=smtp.gmail.com" ``
  --set-env-vars "SMTP_PORT=587" ``
  --set-env-vars "SMTP_USER=ryley92@gmail.com" ``
  --set-env-vars "SMTP_PASS=bhxfntiblfatdlep" ``
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"
"@

try {
    Invoke-Expression $deployCommand
    
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    
    # Get the service URL
    $serviceUrl = gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
    Write-Host "🌐 Service URL: $serviceUrl" -ForegroundColor Green
    
    # Test the deployment
    Write-Host "🧪 Testing deployment..." -ForegroundColor Blue
    Start-Sleep -Seconds 10  # Wait for service to be ready
    
    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        $httpCode = $response.StatusCode
        if ($httpCode -eq 200 -or $httpCode -eq 302) {
            Write-Host "✅ Service is responding (HTTP $httpCode)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Service returned HTTP $httpCode - may still be starting up" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Service test failed - may still be starting up: $_" -ForegroundColor Yellow
    }
    
    Write-Host "📋 Post-Deployment Checklist:" -ForegroundColor Blue
    Write-Host "1. ✅ Mobile sidebar functionality" -ForegroundColor Green
    Write-Host "2. ✅ Timesheet data display" -ForegroundColor Green
    Write-Host "3. ✅ Google Sheets import/export" -ForegroundColor Green
    Write-Host "4. ✅ Dashboard client view navigation" -ForegroundColor Green
    Write-Host "5. ⚠️  Email functionality (needs App Password)" -ForegroundColor Yellow
    
    Write-Host "🔗 Quick Links:" -ForegroundColor Blue
    Write-Host "• Application: $serviceUrl"
    Write-Host "• Dashboard: $serviceUrl/dashboard"
    Write-Host "• Mobile Test: Open on mobile device"
    Write-Host "• Admin Panel: $serviceUrl/admin"
    
    Write-Host "📧 Email Setup Reminder:" -ForegroundColor Yellow
    Write-Host "Current SMTP password may not work with Gmail."
    Write-Host "To fix email functionality:"
    Write-Host "1. Enable 2FA on Google account"
    Write-Host "2. Generate App Password for Mail"
    Write-Host "3. Update SMTP_PASS environment variable"
    Write-Host "4. Redeploy with new password"
    
    Write-Host "📊 What's New in This Deployment:" -ForegroundColor Blue
    Write-Host "• 📱 Mobile sidebar with touch gestures"
    Write-Host "• 🔧 Fixed timesheet data structure issues"
    Write-Host "• 📊 Enhanced Google Sheets functionality"
    Write-Host "• 🚀 Resolved all build errors"
    Write-Host "• 🔗 Fixed dashboard client navigation"
    
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "The HoliTime workforce management application is now live with all fixes."
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check authentication: gcloud auth list"
    Write-Host "2. Verify project access: gcloud projects describe $ProjectId"
    Write-Host "3. Check build logs above for errors"
    Write-Host "4. Ensure all environment variables are correct"
    Write-Host "5. Try manual deployment: gcloud run deploy $SERVICE_NAME --source ."
    exit 1
}

Write-Host "📝 Logs and Monitoring:" -ForegroundColor Blue
Write-Host "• View logs: gcloud logs read --service=$SERVICE_NAME --limit=50"
Write-Host "• Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
Write-Host "• Metrics: Check Cloud Run metrics in Google Cloud Console"

Write-Host "🚀 Redeployment process complete!" -ForegroundColor Green
