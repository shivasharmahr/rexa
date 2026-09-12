require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const { contactRateLimiter } = require('./middleware/rateLimit');
const { initializeEmailService } = require('./utils/emailService');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const baseDir = process.cwd();
console.log(`🚀 Starting server in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`📁 Working directory: ${baseDir}`);

// Initialize email service
initializeEmailService();

// Security middleware
app.use(helmet({
  permissionsPolicy: {
    geolocation: ['(self)'],
    camera: [],
    microphone: []
  }
}));

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'https://www.rexabroking.com',
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:3000'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Serve static files (CSS, images, logos, robots.txt, sitemap.xml, etc.)
const staticPath = path.join(baseDir, '.');
app.use(express.static(staticPath));
console.log(`✓ Static files served from: ${staticPath}`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect .html requests to clean URLs
app.get('/:page.html', (req, res) => {
  res.redirect(301, `/${req.params.page}`);
});

// Routes for HTML pages (clean URLs without .html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper function to serve HTML files
const serveFile = (filename) => {
  return (req, res) => {
    const filepath = path.join(baseDir, filename);
    console.log(`[${req.method}] ${req.path} -> ${filepath}`);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${filepath}`);
      console.error(`📂 Available files in ${baseDir}:`, fs.readdirSync(baseDir).filter(f => f.endsWith('.html')));
      return res.status(404).send(`File not found: ${filename}`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filepath);
  };
};

// Routes - handle both with and without trailing slashes
app.get('/contact', serveFile('contact.html'));
app.get('/contact/', serveFile('contact.html'));

app.get('/general', serveFile('general.html'));
app.get('/general/', serveFile('general.html'));

app.get('/life', serveFile('life.html'));
app.get('/life/', serveFile('life.html'));

app.get('/about', serveFile('about.html'));
app.get('/about/', serveFile('about.html'));

app.get('/privacy', serveFile('privacy.html'));
app.get('/privacy/', serveFile('privacy.html'));

app.get('/terms', serveFile('terms.html'));
app.get('/terms/', serveFile('terms.html'));

app.get('/grievance', serveFile('grievance.html'));
app.get('/grievance/', serveFile('grievance.html'));

// Contact form API with rate limiting
app.use('/api/contact', contactRateLimiter, contactRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Rexa Contact API server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CORS: localhost + ${process.env.CORS_ORIGIN || 'https://www.rexabroking.com'}`);
});
