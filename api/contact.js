const axios = require('axios');
const nodemailer = require('nodemailer');
const validator = require('validator');

// Email transporter
let transporter;

const initializeEmailService = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Validate contact form
const validateContactForm = (body) => {
  const { name, email, phone, company, interest, message } = body;
  const errors = [];

  if (!name || name.trim().length < 2 || name.length > 100) {
    errors.push('Name must be 2-100 characters');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('Valid email is required');
  }

  if (phone && phone.trim().length > 0) {
    if (!validator.isMobilePhone(phone, ['en-IN'])) {
      errors.push('Valid phone number is required');
    }
  }

  if (company && company.length > 150) {
    errors.push('Company name must be less than 150 characters');
  }

  const validInterests = ['general-insurance', 'life-insurance', 'employee-benefits', 'renewal', 'claim'];
  if (!interest || !validInterests.includes(interest)) {
    errors.push('Please select a valid interest');
  }

  if (!message || message.trim().length < 10 || message.length > 5000) {
    errors.push('Message must be 10-5000 characters');
  }

  return errors;
};

// Verify reCAPTCHA
const verifyRecaptcha = async (token) => {
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }
      }
    );

    return {
      success: response.data.success,
      score: response.data.score || 0
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    throw new Error('Failed to verify reCAPTCHA');
  }
};

// Send admin email
const sendAdminEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${validator.escape(contactData.name)}</p>
    <p><strong>Email:</strong> ${validator.escape(contactData.email)}</p>
    <p><strong>Phone:</strong> ${validator.escape(contactData.phone || 'Not provided')}</p>
    <p><strong>Company:</strong> ${validator.escape(contactData.company || 'Not provided')}</p>
    <p><strong>Interest:</strong> ${validator.escape(contactData.interest)}</p>
    <p><strong>Message:</strong></p>
    <p>${validator.escape(contactData.message).replace(/\n/g, '<br>')}</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Rexa Contact: ${validator.escape(contactData.name)} - ${validator.escape(contactData.interest)}`,
    html: emailContent
  };

  return transporter.sendMail(mailOptions);
};

// Send confirmation email
const sendConfirmationEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>Thank You for Contacting Rexa</h2>
    <p>Hello ${validator.escape(contactData.name)},</p>
    <p>We've received your message and appreciate you reaching out to us.</p>
    <p>A Rexa advisor will review your request and get back to you within 24 hours with a clear, comparable quote and personalized recommendations.</p>
    <p><strong>Your Details:</strong></p>
    <ul>
      <li><strong>Name:</strong> ${validator.escape(contactData.name)}</li>
      <li><strong>Email:</strong> ${validator.escape(contactData.email)}</li>
      <li><strong>Interest:</strong> ${validator.escape(contactData.interest)}</li>
    </ul>
    <p>In the meantime, feel free to explore our services or reach out to our team directly at info@rexabroking.com or +91 9945 509 306.</p>
    <p>Best regards,<br>The Rexa Team</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: contactData.email,
    subject: 'We Received Your Message - Rexa Insurance Broking',
    html: emailContent
  };

  return transporter.sendMail(mailOptions);
};

// Main handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { recaptchaToken, name, email, phone, company, interest, message } = req.body;

    // Validate input
    const validationErrors = validateContactForm(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Verify reCAPTCHA (skip in development)
    let recaptchaResult = { success: true, score: 0.9 };
    if (process.env.NODE_ENV === 'production') {
      recaptchaResult = await verifyRecaptcha(recaptchaToken);
    }

    if (!recaptchaResult.success) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed'
      });
    }

    const scoreThreshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5);
    if (recaptchaResult.score < scoreThreshold) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed. Please try again.'
      });
    }

    // Send emails
    console.log('📧 Sending admin email to:', process.env.ADMIN_EMAIL);
    await sendAdminEmail(req.body);

    console.log('📧 Sending confirmation email to:', email);
    await sendConfirmationEmail(req.body);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully. We will get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
}
