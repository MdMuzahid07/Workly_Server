export const getVerificationEmailTemplate = (userName: string, verificationUrl: string) => {
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
