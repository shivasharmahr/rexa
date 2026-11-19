const axios = require('axios');

// Pasted secrets often carry stray whitespace or quotes (Vercel env import, .env copies); either one makes
// Google answer "invalid-input-secret". Normalise before use.
const cleanSecret = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '').trim();

// What Google's error codes mean for us (shown only in the server log, never to visitors).
const HINTS = {
  'missing-input-secret': 'RECAPTCHA_SECRET_KEY is not set in this environment (add it, then redeploy)',
  'invalid-input-secret': 'RECAPTCHA_SECRET_KEY is wrong, or belongs to a different key pair than the site key used in the pages',
  'missing-input-response': 'the browser sent no reCAPTCHA token',
  'invalid-input-response': 'Google rejected the token. Most often RECAPTCHA_SECRET_KEY does not belong to the same key pair as the site key in the pages (Google can report a wrong secret this way); otherwise the token was malformed',
  'timeout-or-duplicate': 'the token expired or was already used (tokens last 2 minutes and work once)',
  'bad-request': 'the verification request itself was malformed',
  'browser-error': 'the visitor\'s browser reported a reCAPTCHA error'
};

// Verifies a reCAPTCHA v3 token. In development the check is skipped so
// forms can be tested locally without a token.
const verifyRecaptcha = async (token) => {
  // Skipped only for local development, and never on Vercel, even if NODE_ENV is mis-set there.
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    return { success: true, score: 0.9 };
  }

  const secret = cleanSecret(process.env.RECAPTCHA_SECRET_KEY);
  if (!secret) {
    return { success: false, score: 0, errorCodes: ['missing-input-secret'] };
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret, response: token }, timeout: 10000 }
    );
    return {
      success: response.data.success,
      score: response.data.score || 0,
      errorCodes: response.data['error-codes'] || [],
      hostname: response.data.hostname,
      action: response.data.action
    };
  } catch (error) {
    console.error('[recaptcha] could not reach Google to verify:', error.message);
    throw new Error('Failed to verify reCAPTCHA');
  }
};

// Returns an error message when the token fails verification, else null.
const checkRecaptcha = async (token) => {
  const result = await verifyRecaptcha(token);
  if (!result.success) {
    const codes = (result.errorCodes || []).join(', ') || 'none given';
    const why = (result.errorCodes || []).map((c) => HINTS[c]).filter(Boolean).join('; ');
    // No secrets or tokens are logged: only Google's reason, the hostname it saw, and a plain-English hint.
    console.error(`[recaptcha] rejected by Google: ${codes}${result.hostname ? ' | hostname ' + result.hostname : ''}${why ? ' | ' + why : ''}`);
    return 'reCAPTCHA verification failed';
  }
  const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5);
  if (result.score < threshold) {
    console.error(`[recaptcha] score ${result.score} is below the threshold ${threshold} (hostname ${result.hostname || '?'}, action ${result.action || '?'})`);
    return 'Verification failed. Please try again.';
  }
  return null;
};

module.exports = { verifyRecaptcha, checkRecaptcha };
