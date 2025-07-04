# OAuth Configuration Fix Guide

## 🚨 Issue: "The OAuth client was not found. Error 401: invalid_client"

This error occurs when the Google OAuth client configuration doesn't match the deployed application URL.

## 📊 Current Configuration Analysis

### Environment Variables (Current):
```
NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app
GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### Actual Service URLs Found:
- **Deployment Output**: https://holitime-369017734615.us-central1.run.app
- **Service Describe**: https://holitime-pqe7awarsa-uc.a.run.app

## 🔧 Step-by-Step Fix

### Step 1: Verify Current Service URL
```bash
gcloud run services describe holitime --platform managed --region us-central1 --format "value(status.url)"
```

### Step 2: Update Google OAuth Client Configuration

1. **Go to Google Cloud Console**:
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Project: handsonlabor (369017734615)

2. **Find OAuth 2.0 Client**:
   - Look for client ID: `369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com`

3. **Update Authorized Redirect URIs**:
   Add both URLs to be safe:
   ```
   https://holitime-369017734615.us-central1.run.app/api/auth/callback/google
   https://holitime-pqe7awarsa-uc.a.run.app/api/auth/callback/google
   ```

4. **Update Authorized JavaScript Origins**:
   Add both URLs:
   ```
   https://holitime-369017734615.us-central1.run.app
   https://holitime-pqe7awarsa-uc.a.run.app
   ```

### Step 3: Update Environment Variables

Update the Cloud Run service with the correct URL:

```bash
# Get the actual service URL
SERVICE_URL=$(gcloud run services describe holitime --platform managed --region us-central1 --format "value(status.url)")

# Update the NEXTAUTH_URL environment variable
gcloud run services update holitime \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NEXTAUTH_URL=$SERVICE_URL"
```

### Step 4: Alternative - Manual Environment Update

If the automatic method doesn't work, manually update:

```bash
gcloud run services update holitime \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NEXTAUTH_URL=https://holitime-pqe7awarsa-uc.a.run.app"
```

## 🔍 Verification Steps

### 1. Check Environment Variables
```bash
gcloud run services describe holitime --platform managed --region us-central1 --format "value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
```

### 2. Test OAuth Flow
1. Open the application URL
2. Click "Sign in with Google"
3. Should redirect to Google OAuth consent screen
4. After authorization, should redirect back to application

### 3. Check Application Logs
```bash
gcloud logs read --service=holitime --limit=50
```

## 🚨 Common Issues and Solutions

### Issue 1: Multiple Service URLs
**Problem**: Cloud Run sometimes generates different URLs
**Solution**: Add all possible URLs to OAuth client configuration

### Issue 2: Environment Variable Not Updated
**Problem**: NEXTAUTH_URL doesn't match actual service URL
**Solution**: Use the exact URL from `gcloud run services describe`

### Issue 3: OAuth Client Disabled
**Problem**: OAuth client was accidentally disabled
**Solution**: Re-enable in Google Cloud Console > APIs & Credentials

### Issue 4: Wrong Project
**Problem**: OAuth client is in different Google Cloud project
**Solution**: Verify project ID matches: handsonlabor (369017734615)

## 📋 Quick Fix Commands

```bash
# 1. Get current service URL
SERVICE_URL=$(gcloud run services describe holitime --platform managed --region us-central1 --format "value(status.url)")
echo "Service URL: $SERVICE_URL"

# 2. Update NEXTAUTH_URL
gcloud run services update holitime \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NEXTAUTH_URL=$SERVICE_URL"

# 3. Wait for deployment
echo "Waiting for deployment to complete..."
sleep 30

# 4. Test the application
echo "Test the application at: $SERVICE_URL"
```

## 🎯 Expected Results After Fix

✅ **OAuth Login Works**: Users can sign in with Google  
✅ **No 401 Errors**: OAuth client found and working  
✅ **Proper Redirects**: Successful authentication flow  
✅ **Application Access**: Users can access the workforce management features  

## 📞 Support Information

If issues persist:
1. **Check Google Cloud Console**: Verify OAuth client configuration
2. **Review Application Logs**: Look for specific error messages
3. **Test Different Browsers**: Clear cache and cookies
4. **Verify Project Settings**: Ensure correct Google Cloud project

## 🔗 Useful Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth Credentials**: https://console.cloud.google.com/apis/credentials?project=handsonlabor
- **Cloud Run Service**: https://console.cloud.google.com/run/detail/us-central1/holitime?project=handsonlabor
- **Application URL**: https://holitime-pqe7awarsa-uc.a.run.app (or current service URL)

## 🎉 Success Indicators

When the fix is complete, you should see:
- ✅ Google OAuth login button works
- ✅ Successful authentication and redirect
- ✅ Access to dashboard and application features
- ✅ No "OAuth client not found" errors
- ✅ Mobile sidebar functionality working
- ✅ All previously fixed features operational
