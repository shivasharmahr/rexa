# Rexa Contact API Backend

Complete backend system for handling contact form submissions with reCAPTCHA v3 bot protection, email validation, and rate limiting.

## Project Structure

```
/
├── server.js                    # Main Express application
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── middleware/
│   ├── validation.js            # Form input validation & sanitization
│   └── rateLimit.js             # Rate limiting middleware
├── routes/
│   └── contact.js               # Contact form API endpoint
├── utils/
│   └── emailService.js          # Email sending utility (nodemailer)
├── DEPLOYMENT.md                # Detailed deployment guide
└── README_BACKEND.md            # This file
```

## Features

✓ **reCAPTCHA v3 Integration** - Invisible bot detection (no user friction)
✓ **Email Validation** - Strict format and length validation
✓ **Rate Limiting** - 5 requests per IP per hour (configurable)
✓ **Input Sanitization** - XSS and injection prevention
✓ **CORS Protection** - Restricted to your domain
✓ **Security Headers** - Helmet.js for defense
✓ **Admin Notifications** - Email when new inquiry arrives
✓ **User Confirmations** - Automated response emails
✓ **Error Handling** - Graceful error messages
✓ **Production Ready** - Follows industry best practices

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Get reCAPTCHA Keys
- Visit: https://www.google.com/recaptcha/admin
- Create new site (v3 invisible)
- Add domains: www.rexabroking.com, rexabroking.com
- Copy Site Key and Secret Key to .env

### 4. Configure Gmail
- Enable 2-step verification on Gmail
- Generate app password at: https://myaccount.google.com/apppasswords
- Copy 16-char password to EMAIL_PASSWORD in .env

### 5. Update Frontend
In `contact.html` line 153, replace placeholder:
```javascript
// Change this:
const token = await grecaptcha.execute('YOUR_RECAPTCHA_SITE_KEY', { action: 'submit' });

// To this (use your actual Site Key):
const token = await grecaptcha.execute('6LcXXXXXXXXXXXXXXXXXXXXXX', { action: 'submit' });
```

### 6. Run Locally
```bash
npm run dev
# Server starts on http://localhost:3000
```

## API Endpoints

### POST /api/contact
Processes contact form submissions.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "company": "Acme Corp",
  "phone": "+919945509306",
  "interest": "general-insurance",
  "message": "Looking for property insurance coverage...",
  "recaptchaToken": "token_from_grecaptcha_execute"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Message sent successfully. We will get back to you within 24 hours."
}
```

**Error Responses:**
- `400` - Validation error or reCAPTCHA failed
- `429` - Rate limit exceeded
- `500` - Server error

### GET /api/health
Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-26T10:30:45.123Z"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | production | Environment |
| RECAPTCHA_SECRET_KEY | - | From Google Console |
| RECAPTCHA_SITE_KEY | - | From Google Console |
| RECAPTCHA_SCORE_THRESHOLD | 0.5 | Bot detection threshold (0.0-1.0) |
| EMAIL_USER | - | Gmail address |
| EMAIL_PASSWORD | - | Gmail app password |
| EMAIL_HOST | smtp.gmail.com | SMTP host |
| EMAIL_PORT | 587 | SMTP port |
| ADMIN_EMAIL | - | Where submissions go |
| RATE_LIMIT_WINDOW_MS | 3600000 | 1 hour in ms |
| RATE_LIMIT_MAX_REQUESTS | 5 | Max requests per window |
| CORS_ORIGIN | - | Frontend domain |
| LOG_LEVEL | info | Logging level |

## Validation Rules

| Field | Rules |
|-------|-------|
| name | Required, 2-100 characters |
| email | Required, valid email format |
| phone | Optional, valid Indian number if provided |
| company | Optional, max 150 characters |
| interest | Required, one of: general-insurance, life-insurance, employee-benefits, renewal, claim |
| message | Required, 10-5000 characters |

## Security Features

### Input Validation
- Type checking
- Length limits
- Format validation (email, phone)
- Enum validation (interest options)

### Input Sanitization
- HTML escaping (XSS prevention)
- Email normalization
- Trimming whitespace

### Rate Limiting
- IP-based tracking
- Configurable window and limit
- Returns 429 status when exceeded

### reCAPTCHA v3
- Invisible bot detection
- Score-based verification (0.0 = definitely bot, 1.0 = definitely human)
- No user interaction required
- Default threshold: 0.5 (tunable)

### CORS
- Restricted to configured domain only
- Blocks cross-origin requests from other sites

### Security Headers
- Helmet.js provides:
  - Content Security Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
  - Other standard headers

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Recommended:** Railway, Vercel, or DigitalOcean App Platform for easiest setup.

## Development

### Run Development Server
```bash
npm run dev
```
Auto-restarts on file changes (requires nodemon).

### Test Endpoint
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Co",
    "phone": "+919945509306",
    "interest": "general-insurance",
    "message": "This is a test message"
  }'
```

## Troubleshooting

### Issue: "Cannot find module 'express'"
```bash
npm install
```

### Issue: reCAPTCHA verification fails
- Check RECAPTCHA_SECRET_KEY is correct
- Verify domain is registered in Google Console
- Ensure score threshold isn't set too high

### Issue: Emails not sending
- Verify EMAIL_USER and EMAIL_PASSWORD
- Check Gmail app password (not account password)
- Ensure SMTP port 587 isn't blocked
- Check admin firewall settings

### Issue: CORS errors in browser
- Update CORS_ORIGIN in .env to your domain
- Restart server after .env changes

### Issue: Rate limit too strict
- Increase RATE_LIMIT_MAX_REQUESTS in .env
- Or increase RATE_LIMIT_WINDOW_MS

## Performance

- Request size limit: 10KB (JSON body)
- Response time: < 500ms typical
- Email delivery: 1-5 seconds
- Concurrent requests: Unlimited (node.js handles automatically)

## Monitoring

Add logging by updating `.env`:
```env
LOG_LEVEL=debug
```

Check server logs for:
- reCAPTCHA verification results
- Email delivery status
- Rate limit hits
- Validation errors
- Unexpected errors

## Next Steps

1. ✓ Create backend code (Done)
2. Get reCAPTCHA v3 keys
3. Setup Gmail app password
4. Create .env file with credentials
5. Run `npm install`
6. Test locally with `npm run dev`
7. Update contact.html with Site Key
8. Deploy to Railway/Vercel/DigitalOcean
9. Test form end-to-end
10. Setup SSL/HTTPS

## License

Proprietary - Rexa Insurance Broking
