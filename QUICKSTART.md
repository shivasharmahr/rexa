# Quick Start Guide - Rexa Contact Form System

Follow these steps to get your contact form working end-to-end.

## ✓ Step 1: Backend Code (DONE)
All files created:
- `server.js` - Main Express app
- `package.json` - Dependencies
- `middleware/validation.js` - Input validation
- `middleware/rateLimit.js` - Rate limiting
- `routes/contact.js` - API endpoint
- `utils/emailService.js` - Email sender

## ✓ Step 2: Install Dependencies (5 minutes)

```bash
cd /Users/shivasharmahr/Documents/projects/rexa
npm install
```

This installs:
- express (web framework)
- nodemailer (email)
- axios (HTTP requests)
- validator (input validation)
- express-rate-limit (rate limiting)
- helmet (security headers)
- cors (cross-origin)
- dotenv (environment variables)

## Step 3: Get reCAPTCHA v3 Keys (10 minutes)

1. Go to: https://www.google.com/recaptcha/admin
2. Click **"Create"** button
3. Fill form:
   - **Label:** Rexa Insurance Broking
   - **Type:** reCAPTCHA v3
   - **Domains:** 
     - www.rexabroking.com
     - rexabroking.com
     - localhost (for testing)
4. Accept terms → Click **Create**
5. **Copy** the Site Key (starts with 6Lc...)
6. **Copy** the Secret Key (long string)

## Step 4: Setup Gmail App Password (10 minutes)

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not enabled)
3. Go back to security settings
4. Find **App passwords** section
5. Select: Mail + Windows Computer
6. Google generates 16-char password
7. **Copy** this password (without spaces)

## Step 5: Create .env File (2 minutes)

```bash
cp .env.example .env
```

Edit `.env` and fill in these values:

```env
PORT=3000
NODE_ENV=production

RECAPTCHA_SECRET_KEY=<paste_your_secret_key>
RECAPTCHA_SITE_KEY=<paste_your_site_key>
RECAPTCHA_SCORE_THRESHOLD=0.5

EMAIL_USER=corporate.blr@rexabroking.com
EMAIL_PASSWORD=<paste_your_16_char_password>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

ADMIN_EMAIL=corporate.blr@rexabroking.com

RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=5

CORS_ORIGIN=https://www.rexabroking.com

LOG_LEVEL=info
```

**Important:** `.env` is in `.gitignore` - it won't be committed (good for security!)

## Step 6: Update Frontend Site Key (1 minute)

In `contact.html` at line 153, replace:

```javascript
// BEFORE (placeholder):
const token = await grecaptcha.execute('YOUR_RECAPTCHA_SITE_KEY', { action: 'submit' });

// AFTER (your actual key):
const token = await grecaptcha.execute('6LcXXXXXXXXXXXXXXXXXXXXXX', { action: 'submit' });
```

Get the Site Key from Step 3.

## Step 7: Test Locally (5 minutes)

Start the backend:

```bash
npm run dev
```

You should see:
```
✓ Rexa Contact API server running on port 3000
✓ Environment: production
✓ CORS origin: https://www.rexabroking.com
```

### Test the API:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Company",
    "phone": "+919945509306",
    "interest": "general-insurance",
    "message": "This is a test message with enough characters",
    "recaptchaToken": "test"
  }'
```

You should get:
```json
{"success": false, "message": "reCAPTCHA verification failed"}
```

This is expected without a real token. The backend is working!

### Test Locally with Browser:

1. Open `contact.html` in your browser
2. Fill in the form
3. Click "Send request"
4. You should see success message

**Note:** You must be testing from localhost or your whitelisted domain.

## Step 8: Choose Deployment Platform (5 minutes)

Pick one:

### Option A: Railway (EASIEST - Recommended)
1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project
4. Connect GitHub repo
5. Add environment variables from `.env`
6. Deploy (automatic)
7. Get URL: `https://your-project.railway.app`

### Option B: Vercel
1. Go to https://vercel.com
2. Import your GitHub repo
3. Add environment variables
4. Deploy (automatic)
5. Get URL: `https://your-project.vercel.app`

### Option C: DigitalOcean App Platform
1. Go to https://digitalocean.com/products/app-platform
2. Create new app
3. Connect GitHub
4. Add environment variables
5. Deploy
6. Get URL: `https://your-project.ondigitalocean.app`

### Option D: Self-hosted VPS
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Step 9: Update Frontend for Production (2 minutes)

In `contact.html` at line 167, update the API endpoint:

```javascript
// DEVELOPMENT:
const response = await fetch('/api/contact', {

// PRODUCTION (if different domain):
const response = await fetch('https://your-deployed-api.com/api/contact', {
```

## Step 10: Test End-to-End (5 minutes)

1. Open your website
2. Go to `/contact.html`
3. Fill form completely
4. Submit
5. Check:
   - ✓ Success message appears
   - ✓ Email received at corporate.blr@rexabroking.com
   - ✓ Confirmation email sent to user

**If any step fails:**
- Check server logs
- Verify .env values
- Check Email spam folder
- See [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section

## Files Created

```
/Users/shivasharmahr/Documents/projects/rexa/
├── server.js                    ← Main backend
├── package.json                 ← Dependencies
├── .env.example                 ← Template (copy to .env)
├── .env                         ← Your secrets (gitignore)
├── middleware/
│   ├── validation.js            ← Input validation
│   └── rateLimit.js             ← Rate limiting
├── routes/
│   └── contact.js               ← API endpoint
├── utils/
│   └── emailService.js          ← Email sender
├── DEPLOYMENT.md                ← Detailed deployment guide
├── README_BACKEND.md            ← Backend documentation
├── QUICKSTART.md                ← This file
└── contact.html                 ← Frontend form
```

## What Each Part Does

### Frontend (contact.html)
- Collects user input
- Validates locally
- Gets reCAPTCHA token
- Sends to backend
- Shows success/error

### Backend (server.js)
- Receives form data
- Verifies reCAPTCHA with Google
- Validates input strictly
- Sanitizes data
- Checks rate limits
- Sends emails
- Returns response

### Email Service (emailService.js)
- Connects to Gmail SMTP
- Sends admin notification (new inquiry)
- Sends user confirmation email
- Handles errors

### Validation (validation.js)
- Checks field types
- Validates lengths
- Checks email format
- Sanitizes HTML
- Prevents injection

### Rate Limiting (rateLimit.js)
- Tracks requests by IP
- Limits to 5 per hour
- Returns 429 when exceeded
- Prevents spam/abuse

## Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Got reCAPTCHA Site Key & Secret Key
- [ ] Got Gmail app password
- [ ] Created `.env` file with all values
- [ ] Updated `contact.html` line 153 with Site Key
- [ ] Tested locally (`npm run dev`)
- [ ] Deployed to Railway/Vercel/DigitalOcean
- [ ] Updated `contact.html` line 167 with production API URL
- [ ] Tested end-to-end (form submission works)
- [ ] Verified emails are being sent

## Common Issues

### "npm: command not found"
Install Node.js from https://nodejs.org/

### "reCAPTCHA verification failed"
- Check RECAPTCHA_SECRET_KEY in .env
- Check domains in Google Console
- Wait a minute for DNS propagation

### "Email password incorrect"
- Use app password (16 chars), not account password
- Go to https://myaccount.google.com/apppasswords
- Re-generate if needed

### "CORS error in browser"
- Update CORS_ORIGIN in .env to your domain
- Restart server: `npm run dev`

### "Form submits but no email"
- Check logs for errors
- Verify EMAIL_USER and EMAIL_PASSWORD
- Check Gmail spam folder

## Support Resources

- Backend README: [README_BACKEND.md](README_BACKEND.md)
- Full Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- reCAPTCHA Docs: https://developers.google.com/recaptcha/docs/v3
- Express.js Docs: https://expressjs.com/
- Nodemailer Docs: https://nodemailer.com/

## Next Steps

1. Complete steps 1-10 above
2. Test everything works
3. Set up monitoring/logging
4. Consider adding analytics
5. Optimize email templates
6. Scale rate limits if needed

**You're almost there!** This is a production-ready system with industry-standard security and error handling. Let me know if you hit any snags.
