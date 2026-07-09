import nodemailer from "nodemailer";
import { env } from "../config/index.js";
import { getPasswordResetEmailTemplate } from "../templates/getPasswordResetEmailTemplate.js";
import { getResendVerificationEmailTemplate } from "../templates/getResendVerificationEmailTemplate.js";
import { getVerificationEmailTemplate } from "../templates/getVerificationEmailTemplate.js";
import { getSubscriptionRenewalEmailTemplate } from "../templates/getSubscriptionRenewalEmailTemplate.js";
import {
  getNewApplicationEmailTemplate,
  getApplicationStatusUpdateEmailTemplate,
  getInterviewScheduledEmailTemplate,
} from "../templates/notificationTemplates.js";

const createTransporter = async () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

const sendVerificationEmail = async (to: string, userName: string, verificationUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job" <${env.SMTP_USER}>`,
      to: to,
      subject: "Verify your Workly_job account",
      html: getVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
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
      subject: "Email Verification - Workly_job",
      html: getResendVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending resend verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

const sendPasswordResetEmail = async (email: string, fullName: string, resetUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job Security" <${env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request - Workly_job",
      html: getPasswordResetEmailTemplate(fullName, resetUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
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
    console.error("Error sending new application premium email:", error);
    throw new Error("Failed to send new application premium email");
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
    console.error("Error sending application status update premium email:", error);
    throw new Error("Failed to send application status update premium email");
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
    console.error("Error sending interview scheduled premium email:", error);
    throw new Error("Failed to send interview scheduled premium email");
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
    subject: `⏳ Your ${params.planName} plan expires in ${params.daysLeft} day${params.daysLeft !== 1 ? "s" : ""} – Renew Now`,
    html: getSubscriptionRenewalEmailTemplate(params),
  });

  return { success: true, messageId: info.messageId };
}
