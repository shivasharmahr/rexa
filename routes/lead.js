const express = require('express');
const validator = require('validator');
const router = express.Router();
const { sendLeadAdminEmail, sendLeadConfirmationEmail } = require('../utils/emailService');
const { checkRecaptcha } = require('../utils/recaptcha');
const { honeypot } = require('../middleware/honeypot');
const { appendToSheet } = require('../utils/googleSheet');

// Quick forms on the product pages: one choice plus an email or a mobile.
const SOURCES = {
  'corporate-risk-audit': 'Corporate Risk: Confidential Audit',
  'employee-benefits-plan': 'Employee Benefits: Design a Plan',
  'retail-quote': 'Retail Insurance: Get a Quote',
  'wellness-upgrade': 'Wellness & Value: Upgrade Plan'
};

router.post('/', honeypot, async (req, res) => {
  try {
    const { source, choice, email, phone, recaptchaToken } = req.body || {};
    const errors = [];

    if (typeof source !== 'string' || !Object.prototype.hasOwnProperty.call(SOURCES, source)) errors.push('Unknown form');
    if (typeof choice !== 'string' || choice.length > 200) errors.push('Invalid selection');

    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    if (cleanEmail && !validator.isEmail(cleanEmail)) errors.push('Valid email is required');
    if (cleanPhone && !validator.isMobilePhone(cleanPhone, ['en-IN'])) errors.push('Valid phone number is required');
    if (!cleanEmail && !cleanPhone) errors.push('Please share an email or mobile number');

    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }

    const captchaError = await checkRecaptcha(recaptchaToken);
    if (captchaError) {
      return res.status(400).json({ success: false, message: captchaError });
    }

    const lead = {
      timestamp: new Date().toISOString(),
      source,
      name: '',
      email: cleanEmail,
      phone: cleanPhone,
      company: '',
      interest: SOURCES[source],
      message: String(choice || '').trim()
    };

    const [saved, mailed] = await Promise.all([
      appendToSheet(lead),
      sendLeadAdminEmail(lead).then(() => true).catch((e) => {
        console.error('Lead email failed:', e.message);
        return false;
      })
    ]);

    if (!saved && !mailed) throw new Error('Neither Google Sheet nor admin email succeeded');

    await sendLeadConfirmationEmail(lead).catch((e) => {
      console.error('Lead confirmation email failed:', e.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Thanks! A Rexa advisor will contact you shortly.'
    });
  } catch (error) {
    console.error('Lead form error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
});

module.exports = router;
