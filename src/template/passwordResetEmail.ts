/**
 * Sends a password reset email to a user.
 *
 * @param email - The email of the user who requested the password reset.
 * @param fullName - The full name of the user who requested the password reset.
 * @param resetUrl - The URL to reset the password (valid for 1 hour).
 *
 * @returns A promise that resolves when the email has been sent.
 */
export const sendPasswordResetEmail = async (email: string, fullName: string, resetUrl: string) => {
  const emailContent = {
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <div style="padding: 40px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${fullName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password. If you made this request, 
            click the button below to reset your password:
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block; 
                      font-weight: bold;
                      font-size: 16px;">
              Reset My Password
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; line-height: 1.6; margin-top: 25px;">
            <strong>Important:</strong> This link will expire in 1 hour for security purposes.
          </p>
          
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. 
            Your password will remain unchanged.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © 2024 Your Company Name. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  // Send email using your preferred service (Resend, SendGrid, etc.)
  // Example with Resend:
  // return await resend.emails.send(emailContent);

  // For now, log the email content (replace with your email service)
  console.log("Sending password reset email:", emailContent);

  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
};
