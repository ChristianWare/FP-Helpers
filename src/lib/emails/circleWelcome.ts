// lib/emails/circleWelcome.ts

type CircleWelcomeEmailProps = {
  recipientFirstName: string;
  recipientEmail: string;
  recipientPassword: string;
  organizerFirstName: string;
  organizerLastName: string;
  circleName: string;
  loginUrl: string;
};

export function buildCircleWelcomeEmail({
  recipientFirstName,
  recipientEmail,
  recipientPassword,
  organizerFirstName,
  organizerLastName,
  circleName,
  loginUrl,
}: CircleWelcomeEmailProps) {
  const organizerName = `${organizerFirstName} ${organizerLastName}`;
  const subject = `${organizerFirstName} set up some help for you`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 520px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111; line-height: 1.3;">
                      Hi ${recipientFirstName} — here to help.
                    </h1>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                      Your friend <strong>${organizerName}</strong> set up <strong>${circleName}</strong> to help you out with groceries and errands.
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">
                      Each week, one of your friends will check in to see what you need from the store. You can add what you want whenever it comes to mind — no need to remember everything at once.
                    </p>

                    <div style="background: #f7f7f8; border-radius: 10px; padding: 24px; margin: 0 0 24px;">
                      <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase;">
                        Your sign-in details
                      </p>
                      <table role="presentation" style="width: 100%; margin-top: 12px;">
                        <tr>
                          <td style="padding: 8px 0; font-size: 15px; color: #666; width: 80px;">Email</td>
                          <td style="padding: 8px 0; font-size: 16px; font-weight: 600; color: #111;">${recipientEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 15px; color: #666; width: 80px;">Password</td>
                          <td style="padding: 8px 0; font-size: 16px; font-weight: 600; color: #111;">${recipientPassword}</td>
                        </tr>
                      </table>
                    </div>

                    <table role="presentation" style="margin: 0 0 24px;">
                      <tr>
                        <td style="background-color: #111; border-radius: 8px;">
                          <a href="${loginUrl}" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Sign in now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 8px; font-size: 14px; color: #888; line-height: 1.5;">
                      If you have trouble signing in, reach out to ${organizerFirstName} — they set this up for you and can help.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
                    <p style="margin: 0; font-size: 14px; color: #999; line-height: 1.5;">
                      If you weren&rsquo;t expecting this, you can safely ignore this email or reach out to ${organizerFirstName}.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 14px; color: #999;">
                Friendship Park Helpers
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Hi ${recipientFirstName} — here to help.

Your friend ${organizerName} set up ${circleName} to help you out with groceries and errands.

Each week, one of your friends will check in to see what you need from the store. You can add what you want whenever it comes to mind.

Your sign-in details:
Email: ${recipientEmail}
Password: ${recipientPassword}

Sign in here: ${loginUrl}

If you have trouble signing in, reach out to ${organizerFirstName} — they set this up for you and can help.

— Friendship Park Helpers
`;

  return { subject, html, text };
}
