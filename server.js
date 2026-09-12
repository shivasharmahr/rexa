require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { contactRateLimiter } = require('./middleware/rateLimit');
const { initializeEmailService } = require('./utils/emailService');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;

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
const staticPath = path.join(__dirname, '.');
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

// Handle both with and without trailing slashes
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/contact/', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));

app.get('/general', (req, res) => res.sendFile(path.join(__dirname, 'general.html')));
app.get('/general/', (req, res) => res.sendFile(path.join(__dirname, 'general.html')));

app.get('/life', (req, res) => res.sendFile(path.join(__dirname, 'life.html')));
app.get('/life/', (req, res) => res.sendFile(path.join(__dirname, 'life.html')));

app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/about/', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));

app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'privacy.html')));
app.get('/privacy/', (req, res) => res.sendFile(path.join(__dirname, 'privacy.html')));

app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'terms.html')));
app.get('/terms/', (req, res) => res.sendFile(path.join(__dirname, 'terms.html')));

app.get('/grievance', (req, res) => res.sendFile(path.join(__dirname, 'grievance.html')));
app.get('/grievance/', (req, res) => res.sendFile(path.join(__dirname, 'grievance.html')));

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
