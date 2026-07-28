const express = require('express');
const axios = require('axios');
const router = express.Router();
const { validateContactForm } = require('../middleware/validation');
const { sendAdminEmail, sendConfirmationEmail } = require('../utils/emailService');

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

router.post('/', validateContactForm, async (req, res) => {
  try {
    const { recaptchaToken } = req.body;

    const recaptchaResult = process.env.NODE_ENV === 'development'
      ? { success: true, score: 0.9 }
      : await verifyRecaptcha(recaptchaToken);

    // Check if reCAPTCHA verification was successful
    if (!recaptchaResult.success) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed'
      });
    }

    // Check reCAPTCHA score (0.0 - 1.0)
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

    console.log('📧 Sending confirmation email to:', req.body.email);
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
});

module.exports = router;
