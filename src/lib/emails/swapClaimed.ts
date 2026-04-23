// lib/emails/swapClaimed.ts

type GroceryItem = {
  name: string;
  quantity: string | null;
  notes: string | null;
};

type SwapClaimedEmailProps = {
  // Perspective — are we writing to the person who asked, or the person who took it?
  perspective: "requester" | "claimer";

  // People
  requesterFirstName: string;
  claimerFirstName: string;
  claimerLastName: string;
  claimerPhone: string | null;

  // The shift
  circleName: string;
  careRecipientFirstName: string;
  shiftDateFull: string;
  typicalArrivalTime: string | null;
  address: string | null;

  // For the claimer only
  groceryItems: GroceryItem[];
  shiftUrl: string;
};

export function buildSwapClaimedEmail({
  perspective,
  requesterFirstName,
  claimerFirstName,
  claimerLastName,
  claimerPhone,
  circleName,
  careRecipientFirstName,
  shiftDateFull,
  typicalArrivalTime,
  address,
  groceryItems,
  shiftUrl,
}: SwapClaimedEmailProps) {
  const timePart = typicalArrivalTime ? ` at ${typicalArrivalTime}` : "";

  if (perspective === "requester") {
    // —— Email to Christian: "Mike took your shift" ——
    const subject = `${claimerFirstName} is covering your ${shiftDateFull} shift`;

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
                      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.08em;">
                        ${circleName} · Covered
                      </p>
                      <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                        You&rsquo;re all set — ${claimerFirstName} took it
                      </h1>
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333;">
                        Hi ${requesterFirstName} — good news. <strong>${claimerFirstName} ${claimerLastName}</strong> is taking over your shift for <strong>${careRecipientFirstName}</strong> on <strong>${shiftDateFull}</strong>${timePart}.
                      </p>
                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">
                        You don&rsquo;t need to do anything else — we&rsquo;ll let ${careRecipientFirstName} know about the change.
                      </p>

                      ${
                        claimerPhone
                          ? `<div style="margin: 0 0 24px; padding: 20px; background: #f7f7f8; border-radius: 10px;">
                              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
                                ${claimerFirstName}&rsquo;s number
                              </p>
                              <p style="margin: 0; font-size: 17px; font-weight: 600; color: #111;">
                                ${claimerPhone}
                              </p>
                              <p style="margin: 8px 0 0; font-size: 14px; color: #666; line-height: 1.5;">
                                In case you want to pass anything along.
                              </p>
                            </div>`
                          : ""
                      }

                      <p style="margin: 0; font-size: 14px; color: #888; line-height: 1.6;">
                        Thanks for asking early — makes everyone&rsquo;s life easier.
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />
                      <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5; text-align: center;">
                        You&rsquo;re still on the ${circleName} rotation for future shifts.
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

    const text = `${circleName} · Covered

You're all set — ${claimerFirstName} took it

Hi ${requesterFirstName} — good news. ${claimerFirstName} ${claimerLastName} is taking over your shift for ${careRecipientFirstName} on ${shiftDateFull}${timePart}.

You don't need to do anything else — we'll let ${careRecipientFirstName} know about the change.
${claimerPhone ? `\n${claimerFirstName}'s number: ${claimerPhone}\nIn case you want to pass anything along.\n` : ""}
Thanks for asking early — makes everyone's life easier.

— Friendship Park Helpers

You're still on the ${circleName} rotation for future shifts.
`;

    return { subject, html, text };
  }

  // —— Email to Mike: "Here's what you picked up" ——
  const subject = `You're covering ${careRecipientFirstName} on ${shiftDateFull}`;

  const groceryListHtml =
    groceryItems.length === 0
      ? `<p style="margin: 0; font-size: 15px; color: #888; font-style: italic;">
          Nothing on the list yet — ${careRecipientFirstName} hasn&rsquo;t added anything.
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
      ? `Nothing on the list yet — ${careRecipientFirstName} hasn't added anything.`
      : groceryItems
          .map((item) => {
            const qty = item.quantity ? ` × ${item.quantity}` : "";
            const note = item.notes ? ` (${item.notes})` : "";
            return `  • ${item.name}${qty}${note}`;
          })
          .join("\n");

  const addressHtml = address
    ? `<p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
        Where
      </p>
      <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111;">
        ${address}
      </p>`
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
                      ${circleName} · Confirmed
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      Thanks for stepping in, ${claimerFirstName}
                    </h1>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">
                      You&rsquo;re covering ${requesterFirstName}&rsquo;s shift for <strong>${careRecipientFirstName}</strong> on <strong>${shiftDateFull}</strong>${timePart}. Here&rsquo;s what you need to know.
                    </p>

                    <div style="margin: 0 0 24px; padding: 20px; background: #f7f7f8; border-radius: 10px;">
                      ${addressHtml}
                      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
                        ${careRecipientFirstName}&rsquo;s list so far
                      </p>
                      ${groceryListHtml}
                    </div>

                    <table role="presentation" style="margin: 0 0 20px;">
                      <tr>
                        <td style="background-color: #7c3aed; border-radius: 10px;">
                          <a href="${shiftUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #f7f3ec; text-decoration: none;">
                            Open shift details →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
                      You&rsquo;ll get the usual reminder emails as the day gets closer.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />
                    <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5; text-align: center;">
                      Thanks for helping ${requesterFirstName} out — this is what circles are for.
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

  const text = `${circleName} · Confirmed

Thanks for stepping in, ${claimerFirstName}

You're covering ${requesterFirstName}'s shift for ${careRecipientFirstName} on ${shiftDateFull}${timePart}. Here's what you need to know.
${addressText}
${careRecipientFirstName}'s list so far:
${groceryListText}

Open shift details: ${shiftUrl}

You'll get the usual reminder emails as the day gets closer.

— Friendship Park Helpers

Thanks for helping ${requesterFirstName} out — this is what circles are for.
`;

  return { subject, html, text };
}
