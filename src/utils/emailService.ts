import nodemailer from "nodemailer";
import { getPasswordResetEmailTemplate } from "../templates/getPasswordResetEmailTemplate.js";
import { getResendVerificationEmailTemplate } from "../templates/getResendVerificationEmailTemplate.js";
import { getVerificationEmailTemplate } from "../templates/getVerificationEmailTemplate.js";

const createTransporter = async () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendVerificationEmail = async (to: string, userName: string, verificationUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly_job" <${process.env.SMTP_USER}>`,
      to: to,
      subject: "Verify your Workly_job account",
      html: getVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
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
      from: `"Workly_job" <${process.env.SMTP_USER}>`,
      to: to,
      subject: "Email Verification - Workly_job",
      html: getResendVerificationEmailTemplate(userName, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Resend verification email sent:", info.messageId);
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
      from: `"Workly_job Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request - Workly_job",
      html: getPasswordResetEmailTemplate(fullName, resetUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

export { sendPasswordResetEmail, sendResendVerificationEmail, sendVerificationEmail };
