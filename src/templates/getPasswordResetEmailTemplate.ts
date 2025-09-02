export const getPasswordResetEmailTemplate = (fullName: string, resetUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Password Reset - Workly-Job</title>
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
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
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
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
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
          color: #dc2626;
          font-size: 14px;
        }
        .warning {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        .warning p {
          color: #991b1b;
          margin: 0;
          font-weight: 500;
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
          <h1>🔐 Password Reset</h1>
          <p>Reset your Workly-Job account password</p>
        </div>

        <!-- Content -->
        <div class="content">
          <h2>Hello ${fullName},</h2>
          <p>We received a request to reset your password for your <strong>Workly-Job</strong> account.</p>
          
          <p>If you made this request, click the button below to reset your password:</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>

          <div class="warning">
            <p>⚠️ <strong>Important:</strong> This link will expire in <strong>1 hour</strong> for security purposes.</p>
          </div>

          <p>If the button doesn't work, please copy and paste the link below into your browser:</p>
          <p class="link">${resetUrl}</p>

          <p style="color: #666; font-size: 14px; margin-top: 25px;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>

          <p style="color: #666; font-size: 14px;">
            If you're having trouble with your account, please contact our support team.
          </p>
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
