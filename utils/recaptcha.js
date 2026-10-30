const axios = require('axios');

// Verifies a reCAPTCHA v3 token. In development the check is skipped so
// forms can be tested locally without a token.
const verifyRecaptcha = async (token) => {
  if (process.env.NODE_ENV === 'development') {
    return { success: true, score: 0.9 };
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token } }
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

// Returns an error message when the token fails verification, else null.
const checkRecaptcha = async (token) => {
  const result = await verifyRecaptcha(token);
  if (!result.success) return 'reCAPTCHA verification failed';
  const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5);
  if (result.score < threshold) return 'Verification failed. Please try again.';
  return null;
};

module.exports = { verifyRecaptcha, checkRecaptcha };
