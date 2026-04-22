// lib/emails/circleWelcome.ts

type CircleWelcomeEmailProps = {
  recipientFirstName: string;
  organizerFirstName: string;
  organizerLastName: string;
  circleName: string;
  signInUrl: string;
};

export function buildCircleWelcomeEmail({
  recipientFirstName,
  organizerFirstName,
  organizerLastName,
  circleName,
  signInUrl,
}: CircleWelcomeEmailProps) {
  const subject = `${organizerFirstName} set up some help for you`;

  const organizerName = `${organizerFirstName} ${organizerLastName}`;

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
                      Each week, one of your friends will check in to see what you need from the store. You can share what you want whenever it comes to mind — no need to remember everything at once.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5; color: #555;">
                      Tap below to see who&rsquo;s coming this week and add to your list:
                    </p>
                    <table role="presentation" style="margin: 0 0 24px;">
                      <tr>
                        <td style="background-color: #111; border-radius: 8px;">
                          <a href="${signInUrl}" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Open your circle
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #888; line-height: 1.5;">
                      This link signs you in automatically — no password needed. If you need another link, just visit the site and enter your email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
                    <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5;">
                      If you&rsquo;re not expecting this, you can ignore this email or reach out to ${organizerFirstName}.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 12px; color: #999;">
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

Each week, one of your friends will check in to see what you need from the store. You can share what you want whenever it comes to mind — no need to remember everything at once.

Tap this link to see who's coming this week and add to your list:

${signInUrl}

This link signs you in automatically — no password needed.

— Friendship Park Helpers
`;

  return { subject, html, text };
}
