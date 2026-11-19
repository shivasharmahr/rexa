// Bot trap: the forms include a hidden "website" field that real visitors never see or fill.
// Bots tend to fill every field, so a value here means "automated". We answer with the same
// success response a real visitor gets (so bots learn nothing) but send no email and save nothing.
const honeypot = (req, res, next) => {
  const trap = req.body && req.body.website;
  if (typeof trap === 'string' && trap.trim() !== '') {
    return res.status(200).json({
      success: true,
      message: 'Message sent successfully. We will get back to you within 24 hours.'
    });
  }
  next();
};

module.exports = { honeypot };
