const nodemailer = require('nodemailer');

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

const sendAdminEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${contactData.name}</p>
    <p><strong>Email:</strong> ${contactData.email}</p>
    <p><strong>Phone:</strong> ${contactData.phone || 'Not provided'}</p>
    <p><strong>Company:</strong> ${contactData.company || 'Not provided'}</p>
    <p><strong>Interest:</strong> ${contactData.interest}</p>
    <p><strong>Message:</strong></p>
    <p>${contactData.message.replace(/\n/g, '<br>')}</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Rexa Contact: ${contactData.name} - ${contactData.interest}`,
    html: emailContent
  };

  return transporter.sendMail(mailOptions);
};

const sendConfirmationEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const emailContent = `
    <h2>Thank You for Contacting Rexa</h2>
    <p>Hello ${contactData.name},</p>
    <p>We've received your message and appreciate you reaching out to us.</p>
    <p>A Rexa advisor will review your request and get back to you within 24 hours with a clear, comparable quote and personalized recommendations.</p>
    <p><strong>Your Details:</strong></p>
    <ul>
      <li><strong>Name:</strong> ${contactData.name}</li>
      <li><strong>Email:</strong> ${contactData.email}</li>
      <li><strong>Interest:</strong> ${contactData.interest}</li>
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

module.exports = {
  initializeEmailService,
  sendAdminEmail,
  sendConfirmationEmail
};
