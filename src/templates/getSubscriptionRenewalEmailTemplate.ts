/**
 * Subscription renewal reminder email template.
 *
 * Design system: Chateau Green palette (mirrors globals.css)
 *   Brand Green:        #33b267  (Chateau Green 500)
 *   Dark CTA Green:     #1e7d47  (Chateau Green 600)
 *   Light Green Tint:   #effaf2  (Chateau Green 50)
 *   Light Green Border: #d8f3de  (Chateau Green 100)
 *
 * Built for maximum inbox compatibility:
 *   - Inline styles only (no external sheets)
 *   - Table-based layout (Outlook / Gmail safe)
 *   - 600 px max-width column
 */
export function getSubscriptionRenewalEmailTemplate(params: {
  userName: string;
  planName: string;
  expiryDate: string; // Human-readable, e.g. "July 29, 2026"
  renewalPrice: string; // e.g. "৳190 BDT"
  renewalUrl: string; // Deep-link to /billing
  daysLeft: number; // 1, 2 or 3
}): string {
  const { userName, planName, expiryDate, renewalPrice, renewalUrl, daysLeft } = params;

  const urgencyLabel =
    daysLeft === 1
      ? '⚡ Expires Tomorrow'
      : daysLeft === 2
        ? '⏳ Expiring in 2 Days'
        : '📅 Expiring in 3 Days';

  const urgencyColor = daysLeft === 1 ? '#dc2626' : '#d97706';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your Workly ${planName} Plan is Expiring Soon</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1e293b;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f0fdf4;min-width:320px;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:16px;
                      box-shadow:0 4px 24px rgba(30,125,71,0.10);
                      border:1px solid #d8f3de;overflow:hidden;">

          <!-- == Header == -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e7d47 0%,#2da05a 100%);
                       padding:40px 32px 32px;text-align:center;">
              <!-- Logo wordmark -->
              <div style="font-size:26px;font-weight:800;color:#ffffff;
                          letter-spacing:-0.5px;margin-bottom:16px;">
                Workly<span style="color:#a7f3c0;">.</span>Job
              </div>
              <!-- Urgency badge -->
              <div style="display:inline-block;background:rgba(255,255,255,0.18);
                          border:1px solid rgba(255,255,255,0.35);
                          color:#ffffff;font-size:13px;font-weight:700;
                          padding:6px 18px;border-radius:9999px;letter-spacing:0.06em;
                          text-transform:uppercase;margin-bottom:18px;">
                ${urgencyLabel}
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.35;">
                Your <em style="font-style:normal;color:#a7f3c0;">${planName}</em> plan<br/>
                expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
              </h1>
            </td>
          </tr>

          <!-- == Body == -->
          <tr>
            <td style="padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Your <strong>${planName}</strong> subscription on Workly.Job is expiring on
                <strong style="color:${urgencyColor};">${expiryDate}</strong>.
                Renew now to keep uninterrupted access to all premium features.
              </p>

              <!-- Plan summary card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#effaf2;border:1px solid #d8f3de;
                            border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:13px;font-weight:600;color:#1e7d47;
                                   text-transform:uppercase;letter-spacing:0.05em;
                                   padding-bottom:14px;" colspan="2">
                          Your Subscription Summary
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#4b5563;padding:5px 0;">Plan</td>
                        <td style="font-size:14px;font-weight:700;color:#111827;
                                   text-align:right;padding:5px 0;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#4b5563;padding:5px 0;">Expiry Date</td>
                        <td style="font-size:14px;font-weight:700;color:${urgencyColor};
                                   text-align:right;padding:5px 0;">${expiryDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#4b5563;
                                   padding:5px 0;border-top:1px solid #d8f3de;">Renewal Cost</td>
                        <td style="font-size:15px;font-weight:800;color:#1e7d47;
                                   text-align:right;padding:5px 0;border-top:1px solid #d8f3de;">
                          ${renewalPrice}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 auto 28px;">
                <tr>
                  <td style="border-radius:10px;
                             background:linear-gradient(135deg,#1e7d47 0%,#2da05a 100%);
                             box-shadow:0 4px 12px rgba(30,125,71,0.30);">
                    <a href="${renewalUrl}"
                       style="display:block;padding:14px 40px;
                              font-size:16px;font-weight:700;color:#ffffff;
                              text-decoration:none;letter-spacing:0.02em;
                              border-radius:10px;">
                      Renew My Plan Now →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you lose note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#fff7ed;border:1px solid #fed7aa;
                            border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                      <strong>⚠️ Without renewal</strong> you will lose access to premium job applications,
                      unlimited CV uploads, and priority search visibility the moment your plan expires.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help note -->
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;text-align:center;">
                Questions? Reply to this email or contact
                <a href="mailto:support@workly-job.com"
                   style="color:#1e7d47;font-weight:600;text-decoration:none;">
                  support@workly-job.com
                </a>
              </p>

            </td>
          </tr>

          <!-- == Footer == -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #d8f3de;
                       padding:20px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Workly.Job · All rights reserved
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because renewal notifications are enabled for your account.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
