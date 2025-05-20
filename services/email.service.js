/**
 * email.service.js - Service for handling email operations
 * Provides methods for sending emails and managing templates
 */

const nodemailer = require('nodemailer');
const { AppError } = require('../utils/error.utils');

class EmailService {
  /**
   * Initialize the email transporter
   * @returns {Object} - Nodemailer transporter
   * @throws {AppError} - If email configuration is missing
   */
  static getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new AppError('E-Mail-Konfiguration fehlt', 500);
    }
    
    return nodemailer.createTransport({
      service: 'gmail', // Can be replaced with SMTP settings
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Email info
   */
  static async sendEmail(options) {
    const { 
      to, 
      subject, 
      text, 
      html, 
      attachments = [],
      from = null,
      cc = null,
      bcc = null,
      priority = 'normal' // 'high', 'normal', 'low'
    } = options;
    
    // Validate required fields
    if (!to || (!text && !html) || !subject) {
      throw new AppError('Empfänger, Betreff und Inhalt sind erforderlich', 400);
    }
    
    // Get transporter
    const transporter = this.getTransporter();
    
    // Set email priority headers
    const priorityMap = {
      high: { priority: '1', importance: 'high', 'x-priority': '1', 'x-msmail-priority': 'High' },
      normal: { priority: '3', importance: 'normal', 'x-priority': '3', 'x-msmail-priority': 'Normal' },
      low: { priority: '5', importance: 'low', 'x-priority': '5', 'x-msmail-priority': 'Low' }
    };
    
    const priorityHeaders = priorityMap[priority] || priorityMap.normal;
    
    // Set mail options
    const mailOptions = {
      from: from || `${process.env.EMAIL_FROM_NAME || 'Hummert Umzug'} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      headers: {
        ...priorityHeaders,
        'X-Mailer': 'Hummert Umzug Email System'
      }
    };
    
    // Set content (text or HTML)
    if (html) {
      mailOptions.html = html;
    } else {
      mailOptions.text = text;
    }
    
    // Add optional fields if provided
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;
    if (attachments.length > 0) mailOptions.attachments = attachments;
    
    // Send email
    return await transporter.sendMail(mailOptions);
  }
  
  /**
   * Send a notification email
   * @param {Object} user - User to notify
   * @param {String} subject - Email subject
   * @param {String} message - Email message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Email info
   */
  static async sendNotification(user, subject, message, options = {}) {
    if (!user || !user.email) {
      throw new AppError('Benutzer hat keine E-Mail-Adresse', 400);
    }
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html: this.formatEmailContent(subject, message, options.templateData),
      ...options
    });
  }
  
  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {String} resetToken - Password reset token
   * @param {String} resetUrl - Reset URL
   * @returns {Promise<Object>} - Email info
   */
  static async sendPasswordReset(user, resetToken, resetUrl) {
    if (!user || !user.email) {
      throw new AppError('Benutzer hat keine E-Mail-Adresse', 400);
    }
    
    const subject = 'Zurücksetzen Ihres Passworts (gültig für 10 Minuten)';
    const message = `
      <p>Sie haben ein Zurücksetzen Ihres Passworts angefordert.</p>
      <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
      <p><a href="${resetUrl}" style="display: inline-block; background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Passwort zurücksetzen</a></p>
      <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
      <p>${resetUrl}</p>
      <p>Wenn Sie kein Zurücksetzen des Passworts angefordert haben, ignorieren Sie bitte diese E-Mail.</p>
      <p>Der Link ist nur 10 Minuten gültig.</p>
    `;
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html: this.formatEmailContent(subject, message),
      priority: 'high'
    });
  }
  
  /**
   * Send welcome email to new user
   * @param {Object} user - New user
   * @returns {Promise<Object>} - Email info
   */
  static async sendWelcome(user) {
    if (!user || !user.email) {
      throw new AppError('Benutzer hat keine E-Mail-Adresse', 400);
    }
    
    const subject = 'Willkommen bei Hummert Umzug';
    const message = `
      <p>Hallo ${user.name || user.email},</p>
      <p>Willkommen bei Hummert Umzug! Wir freuen uns, Sie an Bord zu haben.</p>
      <p>Sie können sich jetzt mit Ihren Anmeldedaten anmelden und unser System verwenden.</p>
      <p>Bei Fragen können Sie sich jederzeit an uns wenden.</p>
      <p>Mit freundlichen Grüßen,<br/>Das Team von Hummert Umzug</p>
    `;
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html: this.formatEmailContent(subject, message)
    });
  }
  
  /**
   * Format email content with a standard template
   * @param {String} subject - Email subject
   * @param {String} content - Email content (HTML)
   * @param {Object} data - Additional template data
   * @returns {String} - Formatted HTML email
   */
  static formatEmailContent(subject, content, data = {}) {
    // Simple email template with responsive design
    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
          }
          .header h1 {
            color: #4285f4;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eaeaea;
          }
          @media only screen and (max-width: 620px) {
            .container {
              width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.companyName || 'Hummert Umzug'}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>${data.footerText || '© Hummert Umzug GmbH. Alle Rechte vorbehalten.'}</p>
            <p>${data.contactInfo || 'Bei Fragen kontaktieren Sie uns unter info@hummert-umzug.de'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Validate email address format
   * @param {String} email - Email to validate
   * @returns {Boolean} - True if email is valid
   */
  static isValidEmail(email) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = EmailService;