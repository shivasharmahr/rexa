const nodemailer = require('nodemailer');

let transporter;

const escapeHtml = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

const sendAdminEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(contactData.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(contactData.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(contactData.phone) || 'Not provided'}</p>
    <p><strong>Company:</strong> ${escapeHtml(contactData.company) || 'Not provided'}</p>
    <p><strong>Interest:</strong> ${escapeHtml(contactData.interest)}</p>
    <p><strong>Message:</strong></p>
    <p>${contactData.message ? escapeHtml(contactData.message).replace(/\n/g, '<br>') : 'Not provided'}</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Rexa Contact: ${escapeHtml(contactData.name)} - ${escapeHtml(contactData.interest)}`,
    html: emailContent
  };

  return transporter.sendMail(mailOptions);
};

const sendConfirmationEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>Thank You for Contacting Rexa</h2>
    <p>Hello ${escapeHtml(contactData.name)},</p>
    <p>We've received your message and appreciate you reaching out to us.</p>
    <p>A Rexa advisor will review your request and get back to you within 24 hours with a clear, comparable quote and personalized recommendations.</p>
    <p><strong>Your Details:</strong></p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(contactData.name)}</li>
      <li><strong>Email:</strong> ${escapeHtml(contactData.email)}</li>
      <li><strong>Interest:</strong> ${escapeHtml(contactData.interest)}</li>
    </ul>
    <p>In the meantime, feel free to explore our services or reach out to our team directly at info@rexabroking.com or +91 44 4867 8884.</p>
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

module.exports = {
  initializeEmailService,
  sendAdminEmail,
  sendConfirmationEmail
};
