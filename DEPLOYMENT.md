# 🚀 Holitime Production Deployment Guide

This guide will help you deploy the Holitime workforce management application to production using Google Cloud Platform.

## 📋 Prerequisites

1. **Google Cloud Account**: Create an account at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud CLI**: Install from [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install from [docker.com](https://www.docker.com/get-started)
4. **Domain Name** (optional): For custom domain setup

## 🔧 Setup Steps

### 1. Google Cloud Project Setup

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (replace 'holitime-prod' with your preferred name)
gcloud projects create holitime-prod --name="Holitime Production"

# Set the project as default
gcloud config set project holitime-prod

# Enable billing (required for Cloud Run)
# Go to: https://console.cloud.google.com/billing
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click **Create Credentials > OAuth 2.0 Client IDs**
4. Configure:
   - Application type: **Web application**
   - Name: **Holitime Production**
   - Authorized origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
5. Save the **Client ID** and **Client Secret**

### 3. Environment Variables

1. Copy the production template:
```bash
cp .env.production.template .env.production
```

2. Fill in your actual values:
```env
DATABASE_URL=your-aiven-database-url
NEXTAUTH_SECRET=your-32-character-secret
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret
```

### 4. Deploy to Google Cloud Run

#### Option A: Automated Deployment Script
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

#### Option B: Manual Deployment
```bash
# Build the Docker image
docker build -t gcr.io/your-project-id/holitime .

# Push to Google Container Registry
docker push gcr.io/your-project-id/holitime

# Deploy to Cloud Run
gcloud run deploy holitime \
  --image gcr.io/your-project-id/holitime \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

### 5. Set Environment Variables in Cloud Run

```bash
# Set all environment variables at once
gcloud run services update holitime \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production,DATABASE_PROVIDER=aiven,DATABASE_SSL=true,NODE_TLS_REJECT_UNAUTHORIZED=0" \
  --set-secrets "DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,JWT_SECRET=jwt-secret:latest"
```

## 🔒 Security Configuration

### 1. Create Secrets in Google Secret Manager

```bash
# Create secrets for sensitive data
echo "your-database-url" | gcloud secrets create database-url --data-file=-
echo "your-nextauth-secret" | gcloud secrets create nextauth-secret --data-file=-
echo "your-google-client-id" | gcloud secrets create google-client-id --data-file=-
echo "your-google-client-secret" | gcloud secrets create google-client-secret --data-file=-
echo "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
```

### 2. Grant Cloud Run Access to Secrets

```bash
# Get the Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe holitime --region us-central1 --format 'value(spec.template.spec.serviceAccountName)')

# Grant access to secrets
gcloud secrets add-iam-policy-binding database-url --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding nextauth-secret --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding google-client-id --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding google-client-secret --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding jwt-secret --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
```

## 🌐 Custom Domain Setup (Optional)

1. **Map your domain**:
```bash
gcloud run domain-mappings create --service holitime --domain your-domain.com --region us-central1
```

2. **Update DNS records** as instructed by Google Cloud

3. **Update OAuth settings** with your new domain

## 📊 Monitoring and Maintenance

### Health Checks
Your app includes a health check endpoint at `/api/health`

### Logs
```bash
# View application logs
gcloud run logs tail holitime --region us-central1
```

### Scaling
```bash
# Update scaling settings
gcloud run services update holitime \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20 \
  --concurrency 100
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` is set

2. **OAuth Issues**
   - Check Google OAuth credentials
   - Verify authorized domains in Google Console
   - Ensure `NEXTAUTH_URL` matches your domain

3. **Build Issues**
   - Check Docker build logs
   - Verify all dependencies are installed

### Support
- Check application logs: `gcloud run logs tail holitime --region us-central1`
- Monitor health: `curl https://your-domain.com/api/health`

## 🎉 Success!

Your Holitime application should now be running in production! 

**Next Steps:**
1. Test all functionality
2. Set up monitoring and alerts
3. Configure backups
4. Set up CI/CD pipeline (optional)
5. Add custom domain SSL certificate
