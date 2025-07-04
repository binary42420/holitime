# Quick Gmail App Password Setup

## 🚀 **Fastest Solution for Gmail Authentication**

Since your current SMTP password isn't working, here's the quickest fix:

### **Step 1: Enable 2-Factor Authentication**
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup process (use your phone)

### **Step 2: Generate App Password**
1. Still in Google Account Security settings
2. Click "2-Step Verification" again
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select "Mail" from dropdown
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### **Step 3: Update Deployment**
Replace your current deployment command with:

```bash
gcloud run deploy holitime \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require" \
  --set-env-vars "NEXTAUTH_SECRET=holitime-super-secure-secret-key-for-production-2024" \
  --set-env-vars "NEXTAUTH_URL=https://holitime-369017734615.us-central1.run.app" \
  --set-env-vars "GOOGLE_CLIENT_ID=369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=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" \
  --set-env-vars "GOOGLE_API_KEY=AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ" \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=ryley92@gmail.com" \
  --set-env-vars "SMTP_PASS=YOUR-16-CHARACTER-APP-PASSWORD-HERE" \
  --set-env-vars "JWT_SECRET=holitime-jwt-secret-key-for-production-2024"
```

**Replace `YOUR-16-CHARACTER-APP-PASSWORD-HERE` with the password from Step 2**

### **Step 4: Test Email**
After deployment, test with:
```bash
curl -X POST https://holitime-369017734615.us-central1.run.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "ryley92@gmail.com"}'
```

---

## 🔧 **Alternative: Service Account (More Secure)**

If you want a more robust solution:

### **Step 1: Create Service Account**
```bash
# Create service account
gcloud iam service-accounts create holitime-email \
  --display-name="HoliTime Email Service"

# Create and download key
gcloud iam service-accounts keys create ~/holitime-email-key.json \
  --iam-account=holitime-email@handsonlabor.iam.gserviceaccount.com

# Enable Gmail API
gcloud services enable gmail.googleapis.com
```

### **Step 2: Set Environment Variables**
```bash
# Get the private key from the JSON file
PRIVATE_KEY=$(cat ~/holitime-email-key.json | jq -r '.private_key')

gcloud run deploy holitime \
  --set-env-vars "GOOGLE_SERVICE_ACCOUNT_EMAIL=holitime-email@handsonlabor.iam.gserviceaccount.com" \
  --set-env-vars "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=$PRIVATE_KEY" \
  --set-env-vars "GMAIL_USER_EMAIL=ryley92@gmail.com"
```

---

## 📊 **Comparison**

| Method | Setup Time | Security | Reliability |
|--------|------------|----------|-------------|
| App Password | 5 minutes | Good | Good |
| Service Account | 15 minutes | Excellent | Excellent |
| OAuth 2.0 | 30 minutes | Excellent | Good |

**Recommendation**: Start with App Password for immediate fix, then upgrade to Service Account for production.

---

## 🎯 **Expected Results**

After setup:
- ✅ Email notifications work
- ✅ Password reset emails send
- ✅ Shift confirmation emails send
- ✅ No authentication errors in logs

---

## 🔍 **Troubleshooting**

If emails still don't work:

1. **Check logs**:
```bash
gcloud logs read --service=holitime --limit=50
```

2. **Verify 2FA is enabled**:
   - Must have 2FA before App Passwords work

3. **Check App Password format**:
   - Should be 16 characters
   - No spaces in environment variable

4. **Test SMTP directly**:
   - Use the test email API endpoint
   - Check response for specific errors
