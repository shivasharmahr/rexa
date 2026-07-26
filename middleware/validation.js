const validator = require('validator');

const validateContactForm = (req, res, next) => {
  const { name, email, phone, company, interest, message } = req.body;

  const errors = [];

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

  // Interest validation
  const validInterests = ['general-insurance', 'life-insurance', 'employee-benefits', 'renewal', 'claim'];
  if (!interest || !validInterests.includes(interest)) {
    errors.push('Please select a valid interest');
  }

  // Message validation
  if (!message || typeof message !== 'string') {
    errors.push('Message is required');
  } else if (message.trim().length < 10) {
    errors.push('Message must be at least 10 characters');
  } else if (message.length > 5000) {
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

  // Sanitize data
  req.body.name = validator.escape(name.trim());
  req.body.email = validator.normalizeEmail(email.trim());
  req.body.phone = phone ? validator.escape(phone.trim()) : '';
  req.body.company = company ? validator.escape(company.trim()) : '';
  req.body.message = validator.escape(message.trim());

  next();
};

module.exports = { validateContactForm };
