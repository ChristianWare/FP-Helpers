/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/emails/magicLink.ts

type MagicLinkEmailProps = {
  email: string;
  url: string;
};

export function buildMagicLinkEmail({ email, url }: MagicLinkEmailProps) {
  const subject = "Your Friendship Park Helpers sign-in link";

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
              <table role="presentation" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111;">
                      Sign in to Friendship Park Helpers
                    </h1>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #555;">
                      Tap the button below to sign in. This link will work for 1 hour.
                    </p>
                    <table role="presentation" style="margin: 0 0 24px;">
                      <tr>
                        <td style="background-color: #111; border-radius: 8px;">
                          <a href="${url}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Sign in
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #888; line-height: 1.5;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px; font-size: 12px; color: #666; word-break: break-all;">
                      <a href="${url}" style="color: #666;">${url}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.5;">
                      If you didn't request this link, you can safely ignore this email.
                      Someone may have typed your email address by mistake.
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

  const text = `Sign in to Friendship Park Helpers

Click the link below to sign in. This link is valid for 1 hour:

${url}

If you didn't request this email, you can safely ignore it.

— Friendship Park Helpers
`;

  return { subject, html, text };
}
