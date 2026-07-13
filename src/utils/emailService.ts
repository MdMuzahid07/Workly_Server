/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import { env } from '../config/index.js';
import { logger } from './logger.js';
import { CircuitBreaker } from './circuitBreaker.js';
import { getPasswordResetEmailTemplate } from '../templates/getPasswordResetEmailTemplate.js';
import { getResendVerificationEmailTemplate } from '../templates/getResendVerificationEmailTemplate.js';
import { getVerificationEmailTemplate } from '../templates/getVerificationEmailTemplate.js';
import { getSubscriptionRenewalEmailTemplate } from '../templates/getSubscriptionRenewalEmailTemplate.js';
import {
  getNewApplicationEmailTemplate,
  getApplicationStatusUpdateEmailTemplate,
  getInterviewScheduledEmailTemplate,
} from '../templates/notificationTemplates.js';

const emailCircuitBreaker = new CircuitBreaker('EmailSMTP', 5, 30000);

const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const originalSendMail = transporter.sendMail.bind(transporter);
  transporter.sendMail = ((mailOptions: any, callback?: any) => {
    return emailCircuitBreaker.execute(async () => {
      return originalSendMail(mailOptions, callback);
    });
  }) as any;

  return transporter;
};

const sendVerificationEmail = async (to: string, userName: string, verificationUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job" <${env.SMTP_USER}>`,
      to: to,
      subject: 'Verify your Workly_job account',
      html: getVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, to }, 'Error sending verification email');
    throw new Error('Failed to send verification email', { cause: error });
  }
};

const sendResendVerificationEmail = async (
  to: string,
  userName: string,
  verificationUrl: string,
) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job" <${env.SMTP_USER}>`,
      to: to,
      subject: 'Email Verification - Workly_job',
      html: getResendVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, to }, 'Error sending resend verification email');
    throw new Error('Failed to send verification email', { cause: error });
  }
};

const sendPasswordResetEmail = async (email: string, fullName: string, resetUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job Security" <${env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request - Workly_job',
      html: getPasswordResetEmailTemplate(fullName, resetUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending password reset email');
    throw new Error('Failed to send password reset email', { cause: error });
  }
};

const sendNewApplicationEmail = async (
  toEmail: string,
  employerName: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  experience: number,
  location: string,
  applicationUrl: string,
) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job Premium" <${env.SMTP_USER}>`,
      to: toEmail,
      subject: `New Application Received: ${candidateName} - ${jobTitle}`,
      html: getNewApplicationEmailTemplate(
        companyName,
        employerName,
        candidateName,
        jobTitle,
        experience,
        location,
        applicationUrl,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, toEmail }, 'Error sending new application premium email');
    throw new Error('Failed to send new application premium email', { cause: error });
  }
};

const sendApplicationStatusUpdateEmail = async (
  toEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  newStatus: string,
  rejectionReason: string | null,
  applicationUrl: string,
) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job Premium" <${env.SMTP_USER}>`,
      to: toEmail,
      subject: `Application Update: ${jobTitle} at ${companyName}`,
      html: getApplicationStatusUpdateEmailTemplate(
        candidateName,
        jobTitle,
        companyName,
        newStatus,
        rejectionReason,
        applicationUrl,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, toEmail }, 'Error sending application status update premium email');
    throw new Error('Failed to send application status update premium email', { cause: error });
  }
};

const sendInterviewScheduledEmail = async (
  toEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  scheduledAt: string,
  notes: string | null,
  applicationUrl: string,
) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job Premium" <${env.SMTP_USER}>`,
      to: toEmail,
      subject: `Interview Scheduled: ${jobTitle} at ${companyName}`,
      html: getInterviewScheduledEmailTemplate(
        candidateName,
        jobTitle,
        companyName,
        scheduledAt,
        notes,
        applicationUrl,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, toEmail }, 'Error sending interview scheduled premium email');
    throw new Error('Failed to send interview scheduled premium email', { cause: error });
  }
};

const sendBroadcastEmail = async (
  to: string,
  userName: string,
  subject: string,
  bodyText: string,
) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly Announcements" <${env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Hi ${userName},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${bodyText}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;">
            You received this system announcement because you have enabled notifications in your account settings.
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, to }, 'Error sending broadcast email');
    throw new Error('Failed to send broadcast email', { cause: error });
  }
};

export {
  sendPasswordResetEmail,
  sendResendVerificationEmail,
  sendVerificationEmail,
  sendNewApplicationEmail,
  sendApplicationStatusUpdateEmail,
  sendInterviewScheduledEmail,
  sendSubscriptionRenewalEmail,
  sendBroadcastEmail,
};

// ---------------------------------------------------------------------------
// Subscription renewal reminder
// ---------------------------------------------------------------------------

async function sendSubscriptionRenewalEmail(params: {
  toEmail: string;
  userName: string;
  planName: string;
  expiryDate: string;
  renewalPrice: string;
  renewalUrl: string;
  daysLeft: number;
}): Promise<{ success: true; messageId: string }> {
  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: `"Workly.Job" <${env.SMTP_USER}>`,
    to: params.toEmail,
    subject: `⏳ Your ${params.planName} plan expires in ${params.daysLeft} day${params.daysLeft !== 1 ? 's' : ''} – Renew Now`,
    html: getSubscriptionRenewalEmailTemplate(params),
  });

  return { success: true, messageId: info.messageId };
}
