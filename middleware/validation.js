const validator = require('validator');

const validateContactForm = (req, res, next) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  // Only plain strings are accepted; anything else is treated as missing.
  const str = (v) => (typeof v === 'string' ? v : undefined);
  const name = str(body.name);
  const email = str(body.email);
  const company = str(body.company);
  const interest = str(body.interest);
  const message = body.message === undefined || body.message === null ? undefined : body.message;
  // Accept common Indian formats such as "+91 98765 43210" or "98765-43210".
  const phone = str(body.phone) !== undefined ? body.phone.replace(/[\s().-]/g, '') : undefined;
  req.body = body;

  const errors = [];
  for (const f of ['phone', 'company']) {
    if (body[f] !== undefined && body[f] !== null && typeof body[f] !== 'string') errors.push(`${f} must be text`);
  }

  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Email validation
  if (!email || !validator.isEmail(email)) {
    errors.push('Valid email is required');
  }

  // Phone validation (optional but validated if provided)
  if (phone && phone.trim().length > 0) {
    if (!validator.isMobilePhone(phone, ['en-IN'])) {
      errors.push('Valid phone number is required');
    }
  }

  // Company validation (optional)
  if (company && company.length > 150) {
    errors.push('Company name must be less than 150 characters');
  }

  // Interest validation. corporate-risk/wellness-value/retail-insurance
  // match the site's real 4-pillar IA (see the hub pages); general-insurance
  // and life-insurance are kept accepted (not offered in the dropdown
  // anymore) purely for backward compatibility with any old link still
  // pointing at them.
  const validInterests = [
    'corporate-risk', 'employee-benefits', 'wellness-value', 'retail-insurance',
    'gap-analysis', 'renewal', 'claim',
    'general-insurance', 'life-insurance'
  ];
  if (!interest || !validInterests.includes(interest)) {
    errors.push('Please select a valid interest');
  }

  // Message validation (optional — the contact form itself labels it
  // "(Optional)", so name/email/company/interest alone must be enough for a
  // valid submission).
  if (message && typeof message !== 'string') {
    errors.push('Message must be text');
  } else if (message && message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  }

  // If there are errors, return 400
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors
    });
  }

  // Sanitize data (HTML-escaping happens where values are rendered, in the
  // email templates, so the Google Sheet stores the text as typed)
  req.body.name = name.trim();
  req.body.email = validator.normalizeEmail(email.trim());
  req.body.phone = phone ? phone.trim() : '';
  req.body.company = company ? company.trim() : '';
  req.body.message = message ? message.trim() : '';

  next();
};

module.exports = { validateContactForm };
