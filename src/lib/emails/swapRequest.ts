// lib/emails/swapRequest.ts

type GroceryItem = {
  name: string;
  quantity: string | null;
  notes: string | null;
};

type SwapRequestEmailProps = {
  // Who's receiving this email
  recipientHelperFirstName: string;

  // Who needs cover
  requesterFirstName: string;
  requesterLastName: string;
  requesterReason: string | null;

  // The circle / person being helped
  circleName: string;
  careRecipientFirstName: string;

  // The shift details
  shiftDateFull: string; // e.g. "Saturday, May 1"
  shiftDateRelative: string; // e.g. "This Saturday" / "Next Saturday" / "In 3 weeks"
  typicalArrivalTime: string | null;
  address: string | null;
  groceryItems: GroceryItem[];

  // Links
  shiftUrl: string; // the specific shift page
  takeShiftUrl: string; // same page — "take this shift" button
};

export function buildSwapRequestEmail({
  recipientHelperFirstName,
  requesterFirstName,
  requesterLastName,
  requesterReason,
  circleName,
  careRecipientFirstName,
  shiftDateFull,
  shiftDateRelative,
  typicalArrivalTime,
  address,
  groceryItems,
  shiftUrl,
  takeShiftUrl,
}: SwapRequestEmailProps) {
  const subject = `${requesterFirstName} needs cover for ${careRecipientFirstName} on ${shiftDateFull}`;

  const timePart = typicalArrivalTime ? ` at ${typicalArrivalTime}` : "";

  // Reason block (optional)
  const reasonHtml = requesterReason
    ? `
        <div style="margin: 0 0 24px; padding: 16px 20px; background: #f7f3ec; border-left: 3px solid #7c3aed; border-radius: 4px;">
          <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.04em;">
            From ${requesterFirstName}
          </p>
          <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6; font-style: italic;">
            &ldquo;${requesterReason}&rdquo;
          </p>
        </div>
      `
    : "";

  const reasonText = requesterReason
    ? `\nFrom ${requesterFirstName}: "${requesterReason}"\n`
    : "";

  // Grocery list
  const groceryListHtml =
    groceryItems.length === 0
      ? `<p style="margin: 0; font-size: 15px; color: #888; font-style: italic;">
          ${careRecipientFirstName} hasn&rsquo;t added anything yet.
         </p>`
      : `<ul style="margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.7; color: #333;">
          ${groceryItems
            .map((item) => {
              const qty = item.quantity ? ` × ${item.quantity}` : "";
              const note = item.notes
                ? ` <span style="color: #888; font-size: 14px;">(${item.notes})</span>`
                : "";
              return `<li><strong>${item.name}</strong>${qty}${note}</li>`;
            })
            .join("")}
         </ul>`;

  const groceryListText =
    groceryItems.length === 0
      ? `${careRecipientFirstName} hasn't added anything yet.`
      : groceryItems
          .map((item) => {
            const qty = item.quantity ? ` × ${item.quantity}` : "";
            const note = item.notes ? ` (${item.notes})` : "";
            return `  • ${item.name}${qty}${note}`;
          })
          .join("\n");

  // Address block (optional)
  const addressHtml = address
    ? `
        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
          Where
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #111; font-weight: 600;">
          ${address}
        </p>
      `
    : "";

  const addressText = address ? `\nWhere: ${address}\n` : "";

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
                      ${circleName} · Cover needed
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      ${requesterFirstName} can&rsquo;t make ${shiftDateRelative.toLowerCase()}
                    </h1>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">
                      Hi ${recipientHelperFirstName} — ${requesterFirstName} ${requesterLastName} is asking for someone to cover their shift for <strong>${careRecipientFirstName}</strong> on <strong>${shiftDateFull}</strong>${timePart}.
                    </p>

                    ${reasonHtml}

                    <div style="margin: 0 0 24px; padding: 20px; background: #f7f7f8; border-radius: 10px;">
                      ${addressHtml}
                      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
                        ${careRecipientFirstName}&rsquo;s list so far
                      </p>
                      ${groceryListHtml}
                    </div>

                    <p style="margin: 0 0 20px; font-size: 15px; color: #555; line-height: 1.6;">
                      If you can help out, tap the button below to claim this shift. First one to claim it gets it — no pressure if you can&rsquo;t.
                    </p>

                    <table role="presentation" style="margin: 0 0 20px;">
                      <tr>
                        <td style="background-color: #7c3aed; border-radius: 10px;">
                          <a href="${takeShiftUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #f7f3ec; text-decoration: none;">
                            Take this shift →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; color: #888; line-height: 1.6;">
                      Or <a href="${shiftUrl}" style="color: #7c3aed; font-weight: 600; text-decoration: none;">open the shift</a> to see more details first.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />

                    <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5; text-align: center;">
                      You&rsquo;re getting this because you&rsquo;re in the ${circleName} rotation.
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

  const text = `${circleName} · Cover needed

${requesterFirstName} can't make ${shiftDateRelative.toLowerCase()}

Hi ${recipientHelperFirstName} — ${requesterFirstName} ${requesterLastName} is asking for someone to cover their shift for ${careRecipientFirstName} on ${shiftDateFull}${timePart}.
${reasonText}${addressText}
${careRecipientFirstName}'s list so far:
${groceryListText}

If you can help out, tap below to claim this shift. First one to claim it gets it — no pressure if you can't.

Take this shift: ${takeShiftUrl}

Or open the shift to see more details: ${shiftUrl}

— Friendship Park Helpers

You're getting this because you're in the ${circleName} rotation.
`;

  return { subject, html, text };
}
