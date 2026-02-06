import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface BookingEmailData {
  customerName: string;
  bookingId: string;
  vehicleName: string;
  licensePlate: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@carrental.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'FleetPulse');
    this.isEnabled = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('EmailService initialized with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not configured. Emails will be logged but not sent.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = options.from || `${this.fromName} <${this.fromEmail}>`;

    if (!this.isEnabled || !this.resend) {
      this.logger.log(`[DEV MODE] Email would be sent:`);
      this.logger.log(`  To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      this.logger.log(`  Subject: ${options.subject}`);
      this.logger.debug(`  Content: ${options.text || options.html?.substring(0, 200)}`);
      return true;
    }

    try {
      const emailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        ...(options.html && { html: options.html }),
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { replyTo: options.replyTo }),
        ...(options.attachments && {
          attachments: options.attachments.map(a => ({
            filename: a.filename,
            content: typeof a.content === 'string' ? Buffer.from(a.content) : a.content,
          })),
        }),
      };
      
      const { data, error } = await this.resend.emails.send(emailOptions as any);

      if (error) {
        this.logger.error(`Failed to send email: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent successfully. ID: ${data?.id}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending error: ${errorMessage}`);
      return false;
    }
  }

  // Booking confirmation email
  async sendBookingConfirmation(to: string, data: BookingEmailData, tenantId?: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-label { color: #6b7280; }
          .detail-value { font-weight: 600; }
          .total { font-size: 1.2em; color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed! ✓</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking has been confirmed. Here are the details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Booking ID</span>
                <span class="detail-value">${data.bookingId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Vehicle</span>
                <span class="detail-value">${data.vehicleName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">License Plate</span>
                <span class="detail-value">${data.licensePlate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pickup Date</span>
                <span class="detail-value">${data.startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Return Date</span>
                <span class="detail-value">${data.endDate}</span>
              </div>
              ${data.pickupLocation ? `
              <div class="detail-row">
                <span class="detail-label">Pickup Location</span>
                <span class="detail-value">${data.pickupLocation}</span>
              </div>
              ` : ''}
              ${data.dropoffLocation ? `
              <div class="detail-row">
                <span class="detail-label">Dropoff Location</span>
                <span class="detail-value">${data.dropoffLocation}</span>
              </div>
              ` : ''}
              <div class="detail-row total">
                <span class="detail-label">Total Amount</span>
                <span class="detail-value">${data.totalAmount}</span>
              </div>
            </div>
            
            <p>Please arrive on time for pickup with your valid driver's license and ID.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing our service!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Booking Confirmed - ${data.vehicleName} (${data.bookingId})`,
      html,
    });
  }

  // Password reset email
  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>We received a request to reset your password.</p>
            <p>Click the button below to reset your password:</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ This link expires in 1 hour.</strong><br>
              If you didn't request a password reset, please ignore this email.
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      html,
    });
  }

  // Welcome email for new users
  async sendWelcomeEmail(to: string, firstName: string, loginUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .features { margin: 20px 0; }
          .feature { padding: 10px 0; padding-left: 25px; position: relative; }
          .feature:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to FleetPulse! 🚗</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Welcome aboard! Your account has been successfully created.</p>
            
            <div class="features">
              <h3>What you can do:</h3>
              <div class="feature">Manage your vehicle fleet</div>
              <div class="feature">Track bookings in real-time</div>
              <div class="feature">Handle customer relationships</div>
              <div class="feature">Monitor maintenance schedules</div>
              <div class="feature">Access detailed analytics</div>
            </div>
            
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>Need help? Contact our support team anytime.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to FleetPulse!',
      html,
    });
  }

  // Generic template email (backward compatibility)
  async sendTemplateEmail(to: string, templateId: string, data: any, tenantId?: string): Promise<void> {
    this.logger.log(`[${tenantId || 'default'}] Sending template email ${templateId} to ${to}`);

    // Map legacy template IDs to new methods
    switch (templateId) {
      case 'booking_confirmation':
        await this.sendBookingConfirmation(to, data, tenantId);
        break;
      case 'password_reset':
        await this.sendPasswordResetEmail(to, data.token, data.resetUrl);
        break;
      case 'welcome':
        await this.sendWelcomeEmail(to, data.firstName, data.loginUrl);
        break;
      default:
        // Fallback for unknown templates
        await this.sendEmail({
          to,
          subject: `Notification: ${templateId}`,
          text: `Template: ${templateId}\nData: ${JSON.stringify(data, null, 2)}`,
        });
    }
  }
}