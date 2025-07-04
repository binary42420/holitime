# Email Authentication Setup Guide

The HoliTime workforce management platform supports multiple email authentication methods. Choose the one that best fits your needs:

## 🔧 **Option 1: Gmail App Password (Simplest)**

**Best for**: Personal Gmail accounts, quick setup

### Setup Steps:
1. **Enable 2FA** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. **Update Environment Variables**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

### Cloud Run Deployment:
```bash
gcloud run deploy holitime \
  --set-env-vars "SMTP_HOST=smtp.gmail.com" \
  --set-env-vars "SMTP_PORT=587" \
  --set-env-vars "SMTP_USER=your-email@gmail.com" \
  --set-env-vars "SMTP_PASS=your-app-password"
```

---

## 🔧 **Option 2: Gmail API with Service Account (Recommended)**

**Best for**: Production environments, Google Workspace

### Setup Steps:
1. **Create Service Account**:
   - Go to Google Cloud Console
   - IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file

2. **Enable Gmail API**:
   - APIs & Services > Library
   - Search for "Gmail API" and enable it

3. **Set up Domain-wide Delegation** (for Workspace):
   - Google Workspace Admin Console
   - Security > API Controls > Domain-wide Delegation
   - Add service account client ID
   - Grant scope: `https://www.googleapis.com/auth/gmail.send`

4. **Update Environment Variables**:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GMAIL_USER_EMAIL=your-email@yourdomain.com
```

### Cloud Run Deployment:
```bash
gcloud run deploy holitime \
  --set-env-vars "GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com" \
  --set-env-vars "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----..." \
  --set-env-vars "GMAIL_USER_EMAIL=your-email@yourdomain.com"
```

---

## 🔧 **Option 3: Gmail OAuth 2.0**

**Best for**: Personal Gmail accounts with OAuth flow

### Setup Steps:
1. **Create OAuth Credentials**:
   - Google Cloud Console
   - APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://developers.google.com/oauthplayground`

2. **Get Refresh Token**:
   - Go to https://developers.google.com/oauthplayground
   - Select Gmail API v1 > `https://www.googleapis.com/auth/gmail.send`
   - Authorize and get refresh token

3. **Update Environment Variables**:
```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_USER_EMAIL=your-email@gmail.com
```

---

## 🔧 **Option 4: Other SMTP Providers**

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### AWS SES:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASS=your-aws-secret-access-key
```

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
```

---

## 🧪 **Testing Email Configuration**

### Test API Endpoint:
```bash
curl -X POST https://your-app-url/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

---

## 🔍 **Troubleshooting**

### Common Issues:

1. **"Invalid login" with Gmail**:
   - Use App Password instead of regular password
   - Enable 2FA first

2. **"Authentication failed" with Service Account**:
   - Check private key format (newlines as `\n`)
   - Verify domain-wide delegation setup
   - Ensure Gmail API is enabled

3. **"Connection timeout"**:
   - Check firewall settings
   - Verify SMTP host and port
   - Try different ports (587, 465, 25)

4. **"OAuth token expired"**:
   - Refresh token automatically handles this
   - Check client ID and secret

### Debug Mode:
Add to environment variables:
```env
DEBUG_EMAIL=true
```

---

## 📊 **Authentication Priority**

The email service tries authentication methods in this order:
1. **Gmail API with Service Account** (if configured)
2. **Gmail OAuth 2.0** (if configured)
3. **SMTP with App Password** (fallback)

---

## 🚀 **Production Recommendations**

1. **Use Service Account** for Google Workspace environments
2. **Use App Passwords** for personal Gmail accounts
3. **Consider SendGrid/AWS SES** for high-volume sending
4. **Enable email queue** for reliability
5. **Monitor email delivery** with logging

---

## 📝 **Current Configuration Status**

Your current deployment uses:
- SMTP Host: smtp.gmail.com
- SMTP Port: 587
- SMTP User: ryley92@gmail.com

**Recommendation**: Switch to App Password or Service Account for better reliability.
