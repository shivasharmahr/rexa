const nodemailer = require('nodemailer');
const path = require('path');

let transporter;

const SITE = 'https://www.rexabroking.com';
const BRAND = {
  navy: '#0A1128',
  red: '#E61C24',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  bg: '#F1F5F9'
};
const CONTACT = {
  phone: '+91 44 4867 8884',
  phoneHref: '+914448678884',
  email: 'info@rexabroking.com',
  claims: '7009 670 090',
  claimsHref: '+917009670090'
};

const escapeHtml = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Strip line breaks so user input can never inject mail headers via subject/name.
const oneLine = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();

const INTEREST_LABELS = {
  'corporate-risk': 'Corporate Risk & Liability',
  'employee-benefits': 'Employee Benefits & Group Health',
  'wellness-value': 'Wellness & Value Additions',
  'retail-insurance': 'Retail Insurance',
  'gap-analysis': 'Policy Gap Analysis',
  'renewal': 'Policy Renewal',
  'claim': 'Claims Support',
  'general-insurance': 'Corporate Risk & Liability',
  'life-insurance': 'Employee Benefits & Group Health'
};
const interestLabel = (v) => INTEREST_LABELS[v] || oneLine(v) || 'Your enquiry';

const firstName = (name) => oneLine(name).split(' ')[0] || 'there';

// The logo travels inside the email (inline CID attachment), so it displays
// even before the site is deployed and without "load images" prompts.
const logoAttachment = () => [{
  filename: 'rexa-logo.png',
  path: path.join(__dirname, '..', 'assets', 'email-logo-white.png'),
  cid: 'rexa-logo'
}];

const fromAddress = () => `"Rexa Insurance Broking" <${process.env.EMAIL_USER}>`;
const replyToAddress = () => process.env.REPLY_TO_EMAIL || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

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

// ---------------------------------------------------------------------------
// Shared branded layout (table-based, inline styles: renders in Gmail,
// Outlook and Apple Mail).
// ---------------------------------------------------------------------------
const layout = ({ preheader, body, footerNote }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>Rexa Insurance Broking</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:${BRAND.text};">
    <tr><td style="background:${BRAND.navy};padding:28px 32px;border-bottom:4px solid ${BRAND.red};">
      <a href="${SITE}" style="text-decoration:none;"><img src="cid:rexa-logo" width="170" alt="Rexa Insurance Broking" style="display:block;border:0;height:auto;"></a>
    </td></tr>
    <tr><td style="padding:36px 32px 12px 32px;font-size:15px;line-height:1.65;">
      ${body}
    </td></tr>
    <tr><td style="padding:8px 32px 32px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};">
        <tr><td style="padding-top:20px;font-size:12px;line-height:1.7;color:${BRAND.muted};">
          <strong style="color:${BRAND.navy};">Rexa Insurance Broking Services Pvt. Ltd.</strong><br>
          IRDA Licensed Direct Broker &middot; Licence No. 611<br>
          G4, Swathi Court, 22/43 Vijayaraghava Road, T Nagar, Chennai &ndash; 600017<br>
          <a href="${SITE}" style="color:${BRAND.muted};">rexabroking.com</a>
          ${footerNote ? `<br><br>${footerNote}` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

const detailRows = (rows) => rows
  .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
  .map(([k, v]) => `<tr>
      <td style="padding:8px 0;width:130px;font-size:13px;color:${BRAND.muted};vertical-align:top;">${escapeHtml(k)}</td>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.text};vertical-align:top;">${escapeHtml(v).replace(/\n/g, '<br>')}</td>
    </tr>`).join('');

const button = (href, label, bg = BRAND.red) =>
  `<a href="${href}" style="display:inline-block;background:${bg};color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a>`;

// ---------------------------------------------------------------------------
// Visitor acknowledgement
// ---------------------------------------------------------------------------
const buildAcknowledgement = (d) => {
  const hasName = !!oneLine(d.name);
  const first = escapeHtml(firstName(d.name));
  const topic = interestLabel(d.interest);
  const isClaim = d.interest === 'claim';

  const claimBox = isClaim ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;background:#FEF2F2;border-left:4px solid ${BRAND.red};border-radius:6px;">
        <tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;">
          <strong style="color:${BRAND.red};">Need urgent help with a claim?</strong><br>
          Our 24&times;7 toll-free claims helpline is available right now:
          <a href="tel:${CONTACT.claimsHref}" style="color:${BRAND.navy};font-weight:bold;">${CONTACT.claims}</a>
        </td></tr>
      </table>` : '';

  const step = (n, title, text) => `<tr>
      <td style="width:36px;vertical-align:top;padding:6px 0;">
        <div style="width:26px;height:26px;border-radius:13px;background:${BRAND.navy};color:#FFFFFF;font-size:13px;font-weight:bold;line-height:26px;text-align:center;">${n}</div>
      </td>
      <td style="padding:6px 0 10px 0;vertical-align:top;">
        <strong style="color:${BRAND.navy};">${title}</strong><br>
        <span style="color:${BRAND.muted};font-size:14px;">${text}</span>
      </td>
    </tr>`;

  const body = `
      <h1 style="margin:0 0 6px 0;font-size:24px;line-height:1.3;color:${BRAND.navy};font-family:Georgia,'Times New Roman',serif;">${hasName ? `Thank you, ${first}.` : 'Thank you for reaching out.'}</h1>
      <p style="margin:0 0 20px 0;color:${BRAND.red};font-size:13px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">We&rsquo;ve received your enquiry</p>
      <p style="margin:0 0 16px 0;">We appreciate you reaching out to Rexa. Your enquiry about <strong>${escapeHtml(topic)}</strong> is now with our advisory team, and a specialist will review it personally.</p>
      ${claimBox}
      <p style="margin:0 0 10px 0;font-weight:bold;color:${BRAND.navy};">What happens next</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        ${step(1, 'We review your request', 'An advisor looks at what you have shared and prepares to help.')}
        ${step(2, 'We get in touch within 24 hours', 'By phone or email, whichever you have given us.')}
        ${step(3, 'You get clear, independent advice', 'Recommendations built around your needs, not an insurer&rsquo;s.')}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;background:#F8FAFC;border-radius:8px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.muted};">Your details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${detailRows([['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Company', d.company], ['Interest', topic]])}
          </table>
        </td></tr>
      </table>
      <p style="margin:0 0 20px 0;">If anything changes, or you would like to add details, simply reply to this email or call us on <a href="tel:${CONTACT.phoneHref}" style="color:${BRAND.navy};font-weight:bold;">${CONTACT.phone}</a>.</p>
      <p style="margin:0 0 28px 0;">${button(SITE, 'Visit rexabroking.com', BRAND.navy)}</p>
      <p style="margin:0 0 4px 0;">Warm regards,</p>
      <p style="margin:0 0 8px 0;font-weight:bold;color:${BRAND.navy};">The Rexa Team</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted};font-style:italic;">Your Risk. Our Responsibility.</p>`;

  const html = layout({
    preheader: `We've received your enquiry about ${topic}. An advisor will be in touch within 24 hours.`,
    body,
    footerNote: 'You are receiving this email because you submitted an enquiry on rexabroking.com. We will only use your details to respond to it.'
  });

  const text = [
    hasName ? `Thank you, ${firstName(d.name)}.` : 'Thank you for reaching out.',
    '',
    `We've received your enquiry about ${topic}. A Rexa advisor will review it and get in touch within 24 hours.`,
    isClaim ? `\nNeed urgent help with a claim? Call our 24x7 toll-free helpline: ${CONTACT.claims}` : '',
    '',
    'What happens next:',
    '1. We review your request',
    '2. We get in touch within 24 hours',
    '3. You get clear, independent advice',
    '',
    `Questions? Reply to this email or call ${CONTACT.phone}.`,
    '',
    'Warm regards,',
    'The Rexa Team',
    'Your Risk. Our Responsibility.',
    '',
    'Rexa Insurance Broking Services Pvt. Ltd. | IRDA Licensed Direct Broker No. 611',
    SITE
  ].filter((l) => l !== undefined).join('\n');

  return {
    subject: `${hasName ? `Thank you, ${firstName(d.name)}` : 'Thank you'} - we've received your enquiry | Rexa`,
    html,
    text
  };
};

// ---------------------------------------------------------------------------
// Internal notification to the Rexa team
// ---------------------------------------------------------------------------
const buildInternalNotification = ({ heading, subject, rows, reply }) => {
  const actions = [];
  if (reply && reply.email) actions.push(button(`mailto:${encodeURIComponent(reply.email).replace(/%40/g, '@')}`, 'Reply by email'));
  if (reply && reply.phone) actions.push(button(`tel:${String(reply.phone).replace(/[^+\d]/g, '')}`, 'Call', BRAND.navy));

  const body = `
      <p style="margin:0 0 4px 0;color:${BRAND.red};font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">New website enquiry</p>
      <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;color:${BRAND.navy};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(heading)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;border-top:1px solid ${BRAND.line};">
        ${detailRows(rows)}
      </table>
      ${actions.length ? `<p style="margin:0 0 20px 0;">${actions.join('&nbsp;&nbsp;')}</p>` : ''}
      <p style="margin:0;font-size:13px;color:${BRAND.muted};">Please respond within 24 hours, as promised to the visitor. This enquiry is also saved in the Google Sheet.</p>`;

  const html = layout({ preheader: subject, body });
  const text = [heading, '', ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join('\n');
  return { subject, html, text };
};

const sendAdminEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  const topic = interestLabel(contactData.interest);
  const mail = buildInternalNotification({
    heading: `${oneLine(contactData.name)} - ${topic}`,
    subject: `${contactData.interest === 'claim' ? '[URGENT] ' : ''}New enquiry: ${topic} - ${oneLine(contactData.name)}`,
    rows: [
      ['Name', contactData.name],
      ['Email', contactData.email],
      ['Phone', contactData.phone],
      ['Company', contactData.company],
      ['Interest', topic],
      ['Message', contactData.message]
    ],
    reply: { email: contactData.email, phone: contactData.phone }
  });

  return transporter.sendMail({
    from: fromAddress(),
    attachments: logoAttachment(),
    to: process.env.ADMIN_EMAIL,
    replyTo: contactData.email,
    ...mail
  });
};

const sendConfirmationEmail = async (contactData) => {
  if (!transporter) initializeEmailService();

  return transporter.sendMail({
    from: fromAddress(),
    attachments: logoAttachment(),
    to: contactData.email,
    replyTo: replyToAddress(),
    ...buildAcknowledgement(contactData)
  });
};

const sendLeadAdminEmail = async (lead) => {
  if (!transporter) initializeEmailService();

  const mail = buildInternalNotification({
    heading: oneLine(lead.interest),
    subject: `New lead: ${oneLine(lead.interest)}`,
    rows: [
      ['Form', lead.interest],
      ['Selection', lead.message],
      ['Email', lead.email],
      ['Mobile', lead.phone]
    ],
    reply: { email: lead.email, phone: lead.phone }
  });

  return transporter.sendMail({
    from: fromAddress(),
    attachments: logoAttachment(),
    to: process.env.ADMIN_EMAIL,
    ...(lead.email ? { replyTo: lead.email } : {}),
    ...mail
  });
};

// Quick-form visitors who left an email get the same acknowledgement.
const sendLeadConfirmationEmail = async (lead) => {
  if (!lead.email) return null;
  if (!transporter) initializeEmailService();

  return transporter.sendMail({
    from: fromAddress(),
    attachments: logoAttachment(),
    to: lead.email,
    replyTo: replyToAddress(),
    ...buildAcknowledgement({ name: '', email: lead.email, phone: lead.phone, interest: lead.interest })
  });
};

module.exports = {
  sendLeadAdminEmail,
  sendLeadConfirmationEmail,
  initializeEmailService,
  sendAdminEmail,
  sendConfirmationEmail,
  buildAcknowledgement
};
