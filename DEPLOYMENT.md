# Rexa Contact API - Deployment Guide

## Prerequisites

- Node.js 16+ installed
- npm or yarn
- A Gmail account with app password enabled
- Google Cloud Console account for reCAPTCHA keys

## Step 1: Get reCAPTCHA v3 Keys

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to add a new site
3. Fill in the form:
   - **Label:** Rexa Insurance Broking
   - **reCAPTCHA type:** reCAPTCHA v3
   - **Domains:** www.rexabroking.com, rexabroking.com
4. Accept terms and click "Create"
5. Copy your **Site Key** and **Secret Key**
6. Paste them in `.env` file:
   ```
   RECAPTCHA_SITE_KEY=your_site_key_here
   RECAPTCHA_SECRET_KEY=your_secret_key_here
   ```

## Step 2: Setup Gmail App Password

1. Enable 2-Step Verification on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows Computer" (or your OS)
4. Generate a 16-character password
5. Copy and paste it in `.env`:
   ```
   EMAIL_PASSWORD=your_16_char_password
   ```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your values:
   ```env
   PORT=3000
   NODE_ENV=production

   RECAPTCHA_SECRET_KEY=your_secret_key_here
   RECAPTCHA_SITE_KEY=your_site_key_here
   RECAPTCHA_SCORE_THRESHOLD=0.5

   EMAIL_USER=corporate.blr@rexabroking.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587

   ADMIN_EMAIL=corporate.blr@rexabroking.com

   RATE_LIMIT_WINDOW_MS=3600000
   RATE_LIMIT_MAX_REQUESTS=5

   CORS_ORIGIN=https://www.rexabroking.com

   LOG_LEVEL=info
   ```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Local Testing

```bash
npm run dev
```

This starts the server on `http://localhost:3000`. Test with:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Company",
    "phone": "+919945509306",
    "interest": "general-insurance",
    "message": "This is a test message",
    "recaptchaToken": "test_token"
  }'
```

## Step 6: Update contact.html with Site Key

In `contact.html`, line 153, replace `YOUR_RECAPTCHA_SITE_KEY` with your actual Site Key:

```javascript
const token = await grecaptcha.execute('YOUR_ACTUAL_SITE_KEY_HERE', { action: 'submit' });
```

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Create new project from repo
4. Add environment variables via Railway dashboard
5. Deploy with one click

**Railway URL:** `https://your-project.railway.app`

### Option 2: Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Create serverless function for Node.js
3. Add `.env` variables to Vercel dashboard
4. Deploy

**Note:** Requires converting to serverless format

### Option 3: DigitalOcean App Platform

1. Sign up at [digitalocean.com](https://www.digitalocean.com/products/app-platform)
2. Create new app from GitHub
3. Set environment variables
4. Deploy

### Option 4: AWS Lambda + API Gateway

1. Install Serverless Framework: `npm install -g serverless`
2. Configure AWS credentials
3. Deploy with `serverless deploy`

### Option 5: Self-hosted (VPS)

1. SSH into your server
2. Install Node.js
3. Clone repo: `git clone <repo-url>`
4. Run: `npm install && npm start`
5. Use PM2 or systemd for auto-restart
6. Setup nginx reverse proxy

```nginx
server {
  listen 80;
  server_name api.rexabroking.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Update Frontend

Update your frontend form to use the deployed API:

```javascript
const response = await fetch('https://api.rexabroking.com/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

Or for same domain:

```javascript
const response = await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## Monitoring & Logs

- **Railway:** View logs in dashboard
- **Vercel:** Check function logs
- **Self-hosted:** `tail -f /var/log/app.log`

## Rate Limiting

Default: 5 requests per IP per hour. Adjust in `.env`:

```env
RATE_LIMIT_WINDOW_MS=3600000    # 1 hour in ms
RATE_LIMIT_MAX_REQUESTS=5       # requests per window
```

## Email Configuration

### Gmail (Current)
- Secure: No
- Port: 587 (TLS)
- Requires app password (not regular password)

### SendGrid (Alternative)
Replace `.env`:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_api_key
```

Update `utils/emailService.js` to use SendGrid SDK.

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] RECAPTCHA_SECRET_KEY is never exposed to frontend
- [ ] CORS_ORIGIN is set to your domain only
- [ ] Email password is app-specific, not account password
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced in production
- [ ] Helmet security headers are enabled
- [ ] Input validation is strict

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### reCAPTCHA always fails
- Verify RECAPTCHA_SECRET_KEY is correct
- Check domain is whitelisted in Google Console
- Ensure score threshold isn't too high

### Emails not sending
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Check Gmail app password (not account password)
- Enable "Less secure app access" if needed
- Check admin firewall blocks SMTP

### Rate limiting blocking legitimate users
- Increase RATE_LIMIT_MAX_REQUESTS
- Whitelist certain IPs in rateLimit.js

## Support

For issues, check:
1. Server logs
2. Email configuration
3. reCAPTCHA keys
4. CORS settings
5. Rate limits
