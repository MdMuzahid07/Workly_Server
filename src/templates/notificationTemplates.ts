/**
 * HTML Templates for Premium Email Notifications
 * Theme: Chateau Green Palette (from globals.css)
 * Brand Green: #33b267 (Chateau Green 500)
 * Dark Green / CTA: #1e7d47 (Chateau Green 600)
 * Light Green Tint: #effaf2 (Chateau Green 50)
 * Light Green Border: #d8f3de (Chateau Green 100)
 */

export const getNewApplicationEmailTemplate = (
  companyName: string,
  employerName: string,
  candidateName: string,
  jobTitle: string,
  experience: number,
  location: string,
  applicationUrl: string,
) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>New Job Application Received</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        border: 1px solid #d8f3de;
      }
      .header {
        background: #1e7d47;
        color: #ffffff;
        padding: 35px 20px;
        text-align: center;
      }
      .badge {
        background: #d8f3de;
        color: #1e7d47;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 10px;
        letter-spacing: 0.05em;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .content {
        padding: 30px 25px;
      }
      .content h2 {
        margin-top: 0;
        font-size: 18px;
        color: #124229;
      }
      .details-card {
        background-color: #effaf2;
        border: 1px solid #d8f3de;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
      .details-row {
        margin: 10px 0;
        font-size: 15px;
      }
      .details-label {
        font-weight: 600;
        color: #1e7d47;
        display: inline-block;
        width: 150px;
      }
      .details-value {
        color: #124229;
      }
      .button {
        display: inline-block;
        background: #33b267;
        color: white !important;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 15px;
        transition: background 0.2s ease;
        text-align: center;
      }
      .button:hover {
        background: #1e7d47;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 13px;
        color: #1e7d47;
        background-color: #effaf2;
        border-top: 1px solid #d8f3de;
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
        <span class="badge">Premium Service ✨</span>
        <h1>New Job Application Received</h1>
      </div>

      <!-- Content -->
      <div class="content">
        <h2>Hello ${employerName},</h2>
        <p>Exciting news! A candidate has just applied for your job opening <strong>"${jobTitle}"</strong> at <strong>${companyName}</strong>.</p>
        
        <p>Here is a summary of the applicant's profile:</p>
        
        <div class="details-card">
          <div class="details-row">
            <span class="details-label">Applicant Name:</span>
            <span class="details-value">${candidateName}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Experience:</span>
            <span class="details-value">${experience} ${experience === 1 ? "year" : "years"}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Location:</span>
            <span class="details-value">${location}</span>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationUrl}" class="button">Review Application</a>
        </div>

        <p>You can view their resume, cover letter, and contact information directly in your Employer Dashboard.</p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>&copy; 2026 Workly-Job. All rights reserved.</p>
        <p>You are receiving this premium email because email notifications are enabled for your account.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

export const getApplicationStatusUpdateEmailTemplate = (
  candidateName: string,
  jobTitle: string,
  companyName: string,
  newStatus: string,
  rejectionReason: string | null,
  applicationUrl: string,
) => {
  let statusText = newStatus.replace(/_/g, " ").toLowerCase();
  let headerColor = "#33b267"; // Default Chateau Green 500
  let statusEmoji = "💼";
  let statusHeadline = "Application Status Update";
  let description = `Your application for <strong>"${jobTitle}"</strong> at <strong>${companyName}</strong> has been updated to <strong>${statusText}</strong>.`;

  if (newStatus === "REVIEWING") {
    headerColor = "#1e7d47"; // Chateau Green 600
    statusEmoji = "🔍";
    statusHeadline = "Your application is in review!";
    description = `Great news! The hiring team at <strong>${companyName}</strong> is actively reviewing your application for the <strong>"${jobTitle}"</strong> position.`;
  } else if (newStatus === "SHORTLISTED") {
    headerColor = "#33b267"; // Chateau Green 500
    statusEmoji = "🎉";
    statusHeadline = "Congratulations! You have been shortlisted!";
    description = `Excellent! You've been shortlisted for the <strong>"${jobTitle}"</strong> role at <strong>${companyName}</strong>. The hiring team will be in touch with you shortly.`;
  } else if (newStatus === "INTERVIEWED") {
    headerColor = "#4fb877"; // Chateau Green 400
    statusEmoji = "🗓️";
    statusHeadline = "Interview Completed / Updated";
    description = `Your application status for <strong>"${jobTitle}"</strong> at <strong>${companyName}</strong> has been updated. The interview stage is currently being processed.`;
  } else if (newStatus === "OFFERED") {
    headerColor = "#18643a"; // Chateau Green 700 (deep brand success green)
    statusEmoji = "🏆";
    statusHeadline = "Fantastic news! You have received a job offer!";
    description = `Congratulations! <strong>${companyName}</strong> has extended a formal job offer to you for the <strong>"${jobTitle}"</strong> position. Please review the offer details!`;
  } else if (newStatus === "ACCEPTED") {
    headerColor = "#155030"; // Chateau Green 800
    statusEmoji = "🤝";
    statusHeadline = "Job Offer Accepted!";
    description = `You have accepted the job offer for <strong>"${jobTitle}"</strong> at <strong>${companyName}</strong>. We wish you the very best of luck in your new role!`;
  } else if (newStatus === "REJECTED") {
    headerColor = "#ef4444"; // Keep Red for destructive rejection status
    statusEmoji = "✉️";
    statusHeadline = "An update on your application";
    description = `Thank you for taking the time to apply for the <strong>"${jobTitle}"</strong> position at <strong>${companyName}</strong>. Unfortunately, the hiring team has decided to proceed with other candidates at this time.`;
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Application Status Update</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        border: 1px solid #d8f3de;
      }
      .header {
        background: ${headerColor};
        color: #ffffff;
        padding: 35px 20px;
        text-align: center;
      }
      .badge {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 10px;
        letter-spacing: 0.05em;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 30px 25px;
      }
      .content h2 {
        margin-top: 0;
        font-size: 18px;
        color: #124229;
      }
      .status-box {
        text-align: center;
        background-color: #effaf2;
        border: 1px dashed ${headerColor};
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        font-size: 16px;
        font-weight: 600;
        color: ${headerColor};
        text-transform: uppercase;
      }
      .rejection-card {
        background-color: #fff5f5;
        border-left: 4px solid #ef4444;
        border-radius: 0 8px 8px 0;
        padding: 15px;
        margin: 20px 0;
        font-size: 14px;
        color: #7f1d1d;
      }
      .rejection-card strong {
        display: block;
        margin-bottom: 5px;
        color: #991b1b;
      }
      .button {
        display: inline-block;
        background: #33b267;
        color: white !important;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 15px;
        transition: background 0.2s ease;
        text-align: center;
      }
      .button:hover {
        background: #1e7d47;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 13px;
        color: #1e7d47;
        background-color: #effaf2;
        border-top: 1px solid #d8f3de;
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
        <span class="badge">Premium Notification ✨</span>
        <h1>${statusEmoji} ${statusHeadline}</h1>
      </div>

      <!-- Content -->
      <div class="content">
        <h2>Hello ${candidateName},</h2>
        <p>${description}</p>

        <div class="status-box">
          Status: ${statusText}
        </div>

        ${
          newStatus === "REJECTED" && rejectionReason
            ? `<div class="rejection-card">
                 <strong>Feedback from hiring team:</strong>
                 "${rejectionReason}"
               </div>`
            : ""
        }

        ${
          newStatus === "REJECTED"
            ? `<p>While this particular role wasn't the perfect match, please don't be discouraged! New positions open daily, and we highly encourage you to keep applying and showcasing your talents.</p>`
            : `<p>You can track your application status, manage interviews, and chat with employers directly inside your Workly-Job account.</p>`
        }

        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationUrl}" class="button">View Application Details</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>&copy; 2026 Workly-Job. All rights reserved.</p>
        <p>You are receiving this premium email because email notifications are enabled for your account.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

export const getInterviewScheduledEmailTemplate = (
  candidateName: string,
  jobTitle: string,
  companyName: string,
  scheduledAt: string,
  notes: string | null,
  applicationUrl: string,
) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Interview Scheduled</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        border: 1px solid #d8f3de;
      }
      .header {
        background: #1e7d47;
        color: #ffffff;
        padding: 35px 20px;
        text-align: center;
      }
      .badge {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 10px;
        letter-spacing: 0.05em;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 30px 25px;
      }
      .content h2 {
        margin-top: 0;
        font-size: 18px;
        color: #124229;
      }
      .details-card {
        background-color: #effaf2;
        border: 1px solid #d8f3de;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
      .details-row {
        margin: 10px 0;
        font-size: 15px;
      }
      .details-label {
        font-weight: 600;
        color: #1e7d47;
        display: inline-block;
        width: 150px;
      }
      .details-value {
        color: #124229;
      }
      .button {
        display: inline-block;
        background: #33b267;
        color: white !important;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 15px;
        transition: background 0.2s ease;
        text-align: center;
      }
      .button:hover {
        background: #1e7d47;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 13px;
        color: #1e7d47;
        background-color: #effaf2;
        border-top: 1px solid #d8f3de;
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
        <span class="badge">Premium Notification ✨</span>
        <h1>🗓️ Interview Scheduled!</h1>
      </div>

      <!-- Content -->
      <div class="content">
        <h2>Hello ${candidateName},</h2>
        <p>Great news! An interview has been scheduled for your job application for the <strong>"${jobTitle}"</strong> role at <strong>${companyName}</strong>.</p>
        
        <p>Interview Details:</p>
        
        <div class="details-card">
          <div class="details-row">
            <span class="details-label">Date & Time:</span>
            <span class="details-value">${scheduledAt}</span>
          </div>
          ${
            notes
              ? `<div class="details-row">
                  <span class="details-label">Notes/Location:</span>
                  <span class="details-value">${notes}</span>
                </div>`
              : ""
          }
        </div>

        <p>Please log in to your Workly-Job account to view additional details and connect with the hiring manager.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationUrl}" class="button">Go to Dashboard</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>&copy; 2026 Workly-Job. All rights reserved.</p>
        <p>You are receiving this premium email because email notifications are enabled for your account.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};
