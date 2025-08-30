import nodemailer from "nodemailer";

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

const getVerificationEmailTemplate = (userName: string, verificationUrl: string) => {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background-color: #f3f4f6;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 25px;
      background-color: #fafafa;
    }
    .content h2 {
      margin-top: 0;
      font-size: 20px;
      color: #111827;
    }
    .content p {
      font-size: 15px;
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: opacity 0.2s ease-in-out;
    }
    .button:hover {
      opacity: 0.9;
    }
    .link {
      word-break: break-word;
      color: #4f46e5;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: #6b7280;
      background-color: #f9fafb;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Welcome to Workly-Job 🎉</h1>
      <p>Confirm your email to activate your account</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>Thank you for signing up with <strong>Workly-Job</strong>!  
         To unlock your account and start exploring job opportunities, please confirm your email address:</p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${verificationUrl}" class="button">Verify My Email</a>
      </div>

      <p>If the button doesn’t work, please copy and paste the link below into your browser:</p>
      <p class="link">${verificationUrl}</p>

      <p><strong>Note:</strong> This link will expire in <strong>24 hours</strong> for security reasons.</p>

      <p>If you did not create an account with Workly-Job, you can safely ignore this email.</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>&copy; 2025 Workly-Job. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>

  `;
};

const getResendVerificationEmailTemplate = (userName: string, verificationUrl: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - Workly-Job</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Email Verification</h1>
        <p>Complete your Workly-Job registration</p>
      </div>
      <div class="content">
        <h2>Hello ${userName},</h2>
        <p>You requested a new verification email for your Workly-Job account. Please click the button below to verify your email address:</p>
        
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
        
        <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't request this email, you can safely ignore it.</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 Workly-Job. All rights reserved.</p>
        <p>This is an automated email, please do not reply.</p>
      </div>
    </body>
    </html>
  `;
};

const sendVerificationEmail = async (to: string, userName: string, verificationUrl: string) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Workly-Job" <${process.env.SMTP_USER}>`,
      to: to,
      subject: "Verify your Workly-Job account",
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
      from: `"Workly-Job" <${process.env.SMTP_USER}>`,
      to: to,
      subject: "Email Verification - Workly-Job",
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

export { sendResendVerificationEmail, sendVerificationEmail };
