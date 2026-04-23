// lib/emails/circleCompleted.ts

type CircleCompletedEmailProps = {
  recipientFirstName: string; // who the email is addressed to (organizer or helper)
  careRecipientFirstName: string; // the person the circle was helping
  careRecipientLastName: string;
  circleName: string;
  startDateLabel: string; // "March 3"
  endDateLabel: string; // "April 14"
  weeksRun: number;
  totalShiftsCompleted: number;
  helperNames: string[];
  perspective: "organizer" | "helper";
};

export function buildCircleCompletedEmail({
  recipientFirstName,
  careRecipientFirstName,
  careRecipientLastName,
  circleName,
  startDateLabel,
  endDateLabel,
  weeksRun,
  totalShiftsCompleted,
  helperNames,
  perspective,
}: CircleCompletedEmailProps) {
  const subject =
    perspective === "organizer"
      ? `${circleName} wrapped up — thank you`
      : `Thanks for helping ${careRecipientFirstName}`;

  const headline =
    perspective === "organizer"
      ? `${circleName} is complete`
      : `Thanks for showing up, ${recipientFirstName}`;

  const openingLine =
    perspective === "organizer"
      ? `The care circle you organized for ${careRecipientFirstName} ${careRecipientLastName} wrapped up on ${endDateLabel}. Here's what you and your helpers pulled off together:`
      : `The care circle for ${careRecipientFirstName} ${careRecipientLastName} wrapped up on ${endDateLabel}. You were part of something that mattered — here's what your group did together:`;

  const helperListText = helperNames.join(", ");

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
              <table role="presentation" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.08em;">
                      ${circleName} · Complete
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      ${headline}
                    </h1>
                    <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.6; color: #333;">
                      ${openingLine}
                    </p>

                    <div style="margin: 0 0 28px; padding: 24px; background: #faf7ff; border: 1px solid #e9d5ff; border-radius: 12px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;">
                            Ran from
                          </td>
                          <td style="padding: 8px 0; font-size: 16px; color: #111; font-weight: 600; text-align: right;">
                            ${startDateLabel} → ${endDateLabel}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; border-top: 1px solid #e9d5ff;">
                            Weeks
                          </td>
                          <td style="padding: 8px 0; font-size: 16px; color: #111; font-weight: 600; text-align: right; border-top: 1px solid #e9d5ff;">
                            ${weeksRun}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; border-top: 1px solid #e9d5ff;">
                            Shifts completed
                          </td>
                          <td style="padding: 8px 0; font-size: 16px; color: #111; font-weight: 600; text-align: right; border-top: 1px solid #e9d5ff;">
                            ${totalShiftsCompleted}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; border-top: 1px solid #e9d5ff; vertical-align: top;">
                            Helpers
                          </td>
                          <td style="padding: 8px 0; font-size: 16px; color: #111; font-weight: 600; text-align: right; border-top: 1px solid #e9d5ff;">
                            ${helperListText}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333;">
                      ${
                        perspective === "organizer"
                          ? `That's a lot of Friday mornings, a lot of groceries, a lot of checking in. ${careRecipientFirstName} was lucky to have you pulling this together.`
                          : `Every shift you showed up for mattered. This is what community looks like.`
                      }
                    </p>

                    <p style="margin: 0; font-size: 14px; color: #888; line-height: 1.6;">
                      The circle is now closed. If you ever need to set up another one — or just want to look back at what you did — everything stays archived in your account.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />
                    <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5; text-align: center;">
                      With gratitude,<br/>
                      Friendship Park Helpers
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `${circleName} · Complete

${headline}

${openingLine}

Ran from: ${startDateLabel} → ${endDateLabel}
Weeks: ${weeksRun}
Shifts completed: ${totalShiftsCompleted}
Helpers: ${helperListText}

${
  perspective === "organizer"
    ? `That's a lot of Friday mornings, a lot of groceries, a lot of checking in. ${careRecipientFirstName} was lucky to have you pulling this together.`
    : `Every shift you showed up for mattered. This is what community looks like.`
}

The circle is now closed. If you ever need to set up another one — or just want to look back — everything stays archived in your account.

With gratitude,
Friendship Park Helpers
`;

  return { subject, html, text };
}
