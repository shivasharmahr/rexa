const express = require('express');
const router = express.Router();
const { validateContactForm } = require('../middleware/validation');
const { sendAdminEmail, sendConfirmationEmail } = require('../utils/emailService');
const { checkRecaptcha } = require('../utils/recaptcha');
const { appendToSheet } = require('../utils/googleSheet');

router.post('/', validateContactForm, async (req, res) => {
  try {
    const captchaError = await checkRecaptcha(req.body.recaptchaToken);
    if (captchaError) {
      return res.status(400).json({ success: false, message: captchaError });
    }

    const { name, email, phone, company, interest, message } = req.body;

    // Save to Google Sheets and send emails; the enquiry counts as received
    // if at least one of them worked, so nothing is silently lost.
    const [saved, adminSent] = await Promise.all([
      appendToSheet({
        timestamp: new Date().toISOString(),
        source: req.body.source || 'contact-form',
        name, email, phone, company, interest, message
      }),
      sendAdminEmail(req.body).then(() => true).catch((e) => {
        console.error('Admin email failed:', e.message);
        return false;
      })
    ]);

    if (!saved && !adminSent) {
      throw new Error('Neither Google Sheet nor admin email succeeded');
    }

    await sendConfirmationEmail(req.body).catch((e) => {
      console.error('Confirmation email failed:', e.message);
    });

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
