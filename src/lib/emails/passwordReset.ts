// lib/emails/passwordReset.ts

type PasswordResetEmailProps = {
  firstName: string;
  resetUrl: string;
};

export function buildPasswordResetEmail({
  firstName,
  resetUrl,
}: PasswordResetEmailProps) {
  const subject = "Reset your password";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f3ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 520px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.08em;">
                      Friendship Park Helpers
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      Reset your password
                    </h1>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                      Hi ${firstName} — we got a request to reset your password. Click the button below to set a new one.
                    </p>

                    <table role="presentation" style="margin: 24px 0;">
                      <tr>
                        <td style="background-color: #7c3aed; border-radius: 10px;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #f7f3ec; text-decoration: none;">
                            Set a new password →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px; font-size: 14px; color: #666; line-height: 1.6;">
                      This link expires in <strong>1 hour</strong>. If you didn&rsquo;t ask to reset your password, you can safely ignore this email — your password won&rsquo;t change.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

                    <p style="margin: 0; font-size: 13px; color: #888; line-height: 1.5;">
                      Button not working? Copy and paste this link:<br />
                      <span style="color: #7c3aed; word-break: break-all;">${resetUrl}</span>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 13px; color: #999;">
                Friendship Park Helpers
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Friendship Park Helpers — Reset your password

Hi ${firstName} — we got a request to reset your password. Use this link to set a new one:

${resetUrl}

This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email — your password won't change.
`;

  return { subject, html, text };
}
