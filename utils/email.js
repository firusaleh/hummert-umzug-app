// utils/email.js
const nodemailer = require('nodemailer');

/**
 * Sends an email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email text content
 * @param {string} [options.html] - Email HTML content (optional)
 * @returns {Promise} - Promise that resolves when email is sent
 */
exports.sendEmail = async (options) => {
  // Create a transporter - for development, use ethereal.email (nodemailer test account)
  let transporter;
  
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // For development, use ethereal.email test account or other test service
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'Hummert Umzug'} <${process.env.EMAIL_FROM || 'noreply@hummert-umzug.de'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // Send the email
  const info = await transporter.sendMail(mailOptions);
  
  // Log email URL in development for testing
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Email sent: ${nodemailer.getTestMessageUrl(info)}`);
  }
  
  return info;
};

/**
 * Creates HTML template with standard layout
 * @param {string} content - HTML content to be placed in template
 * @returns {string} - Complete HTML email template
 */
exports.createHtmlTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hummert Umzug</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #3498db;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
        a {
          color: #3498db;
          text-decoration: none;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hummert Umzug</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Hummert Umzug. Alle Rechte vorbehalten.</p>
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends a password reset email with nice HTML formatting
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.resetUrl - Password reset URL
 * @returns {Promise} - Promise that resolves when email is sent
 */
exports.sendPasswordResetEmail = async (options) => {
  const htmlContent = `
    <h2>Hallo ${options.name || 'Benutzer'},</h2>
    <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
    <p>Bitte klicken Sie auf den folgenden Button, um Ihr Passwort zurückzusetzen:</p>
    <p><a href="${options.resetUrl}" class="button">Passwort zurücksetzen</a></p>
    <p>Alternativ können Sie auch den folgenden Link in Ihren Browser kopieren:</p>
    <p><a href="${options.resetUrl}">${options.resetUrl}</a></p>
    <p>Der Link ist 1 Stunde gültig.</p>
    <p>Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.</p>
    <p>Mit freundlichen Grüßen<br>Das Hummert Umzug Team</p>
  `;
  
  return exports.sendEmail({
    email: options.email,
    subject: 'Passwort zurücksetzen für Hummert Umzug',
    message: `Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Bitte klicken Sie auf folgenden Link: ${options.resetUrl}`,
    html: exports.createHtmlTemplate(htmlContent)
  });
};

/**
 * Sends a welcome email to new users
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @returns {Promise} - Promise that resolves when email is sent
 */
exports.sendWelcomeEmail = async (options) => {
  const htmlContent = `
    <h2>Herzlich Willkommen, ${options.name || 'Benutzer'}!</h2>
    <p>Wir freuen uns, Sie bei Hummert Umzug begrüßen zu dürfen.</p>
    <p>Ihr Konto wurde erfolgreich erstellt und Sie können sich nun anmelden:</p>
    <p><a href="${options.loginUrl}" class="button">Zur Anmeldung</a></p>
    <p>Mit freundlichen Grüßen<br>Das Hummert Umzug Team</p>
  `;
  
  return exports.sendEmail({
    email: options.email,
    subject: 'Willkommen bei Hummert Umzug',
    message: `Willkommen bei Hummert Umzug! Ihr Konto wurde erfolgreich erstellt.`,
    html: exports.createHtmlTemplate(htmlContent)
  });
};