// lib/emails/shiftReminder.ts

type GroceryItem = {
  name: string;
  quantity: string | null;
  notes: string | null;
};

type Prescription = {
  medicationName: string;
  pharmacyName: string | null;
  needsPickupThisWeek: boolean;
};

type ShiftReminderEmailProps = {
  helperFirstName: string;
  recipientFirstName: string;
  recipientLastName: string;
  circleName: string;
  daysBefore: 7 | 2 | 1;
  shiftDateFull: string; // e.g. "Saturday, May 1"
  shiftDateShort: string; // e.g. "This Saturday" or "Tomorrow"
  typicalArrivalTime: string | null;
  address: string | null;
  accessNotes: string | null;
  groceryItems: GroceryItem[];
  prescriptions: Prescription[];
  emergencyContact: string | null;
  emergencyPhone: string | null;
  shiftUrl: string;
  mapsUrl: string | null;
};

function subjectFor(
  daysBefore: 7 | 2 | 1,
  recipientFirstName: string,
  shiftDateShort: string,
): string {
  switch (daysBefore) {
    case 7:
      return `Heads up: you're helping ${recipientFirstName} next week`;
    case 2:
      return `You're helping ${recipientFirstName} ${shiftDateShort.toLowerCase()}`;
    case 1:
      return `Tomorrow: shopping for ${recipientFirstName}`;
  }
}

function openingLine(
  daysBefore: 7 | 2 | 1,
  helperFirstName: string,
  recipientFirstName: string,
  shiftDateFull: string,
  typicalArrivalTime: string | null,
): string {
  const timePart = typicalArrivalTime ? ` at ${typicalArrivalTime}` : "";

  switch (daysBefore) {
    case 7:
      return `Hi ${helperFirstName} — just a heads up that you're up for ${recipientFirstName} on <strong>${shiftDateFull}</strong>${timePart}. No action needed yet; this is just so you can plan around it.`;
    case 2:
      return `Hi ${helperFirstName} — you're helping ${recipientFirstName} on <strong>${shiftDateFull}</strong>${timePart}. Here's the latest list so you can plan your trip.`;
    case 1:
      return `Hi ${helperFirstName} — a friendly reminder that you're helping ${recipientFirstName} <strong>tomorrow</strong>${timePart}. Here's what they need.`;
  }
}

function openingLineText(
  daysBefore: 7 | 2 | 1,
  helperFirstName: string,
  recipientFirstName: string,
  shiftDateFull: string,
  typicalArrivalTime: string | null,
): string {
  const timePart = typicalArrivalTime ? ` at ${typicalArrivalTime}` : "";

  switch (daysBefore) {
    case 7:
      return `Hi ${helperFirstName} — just a heads up that you're up for ${recipientFirstName} on ${shiftDateFull}${timePart}. No action needed yet; this is just so you can plan around it.`;
    case 2:
      return `Hi ${helperFirstName} — you're helping ${recipientFirstName} on ${shiftDateFull}${timePart}. Here's the latest list so you can plan your trip.`;
    case 1:
      return `Hi ${helperFirstName} — a friendly reminder that you're helping ${recipientFirstName} tomorrow${timePart}. Here's what they need.`;
  }
}

export function buildShiftReminderEmail({
  helperFirstName,
  recipientFirstName,
  recipientLastName,
  circleName,
  daysBefore,
  shiftDateFull,
  shiftDateShort,
  typicalArrivalTime,
  address,
  accessNotes,
  groceryItems,
  prescriptions,
  emergencyContact,
  emergencyPhone,
  shiftUrl,
  mapsUrl,
}: ShiftReminderEmailProps) {
  const subject = subjectFor(daysBefore, recipientFirstName, shiftDateShort);
  const opening = openingLine(
    daysBefore,
    helperFirstName,
    recipientFirstName,
    shiftDateFull,
    typicalArrivalTime,
  );
  const openingText = openingLineText(
    daysBefore,
    helperFirstName,
    recipientFirstName,
    shiftDateFull,
    typicalArrivalTime,
  );

  // Grocery list HTML
  const groceryListHtml =
    groceryItems.length === 0
      ? `<p style="margin: 0; font-size: 15px; color: #888; font-style: italic;">
          ${recipientFirstName} hasn&rsquo;t added anything yet.
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

  // Grocery list text
  const groceryListText =
    groceryItems.length === 0
      ? `${recipientFirstName} hasn't added anything yet.`
      : groceryItems
          .map((item) => {
            const qty = item.quantity ? ` × ${item.quantity}` : "";
            const note = item.notes ? ` (${item.notes})` : "";
            return `  • ${item.name}${qty}${note}`;
          })
          .join("\n");

  // Prescriptions
  const activePickups = prescriptions.filter((p) => p.needsPickupThisWeek);
  const rxHtml =
    activePickups.length === 0
      ? ""
      : `
        <div style="margin: 0 0 24px; padding: 20px; background: #fef9c3; border: 1px solid #fde047; border-radius: 10px;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #854d0e; text-transform: uppercase; letter-spacing: 0.04em;">
            Prescription pickups needed
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6; color: #713f12;">
            ${activePickups
              .map(
                (p) =>
                  `<li><strong>${p.medicationName}</strong>${p.pharmacyName ? ` — ${p.pharmacyName}` : ""}</li>`,
              )
              .join("")}
          </ul>
        </div>
      `;

  const rxText =
    activePickups.length === 0
      ? ""
      : `\nPrescription pickups needed:\n${activePickups
          .map(
            (p) =>
              `  • ${p.medicationName}${p.pharmacyName ? ` — ${p.pharmacyName}` : ""}`,
          )
          .join("\n")}\n`;

  // Address block
  const addressHtml = address
    ? `
        <div style="margin: 0 0 24px; padding: 20px; background: #f7f7f8; border-radius: 10px;">
          <p style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
            Drop off
          </p>
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #111; line-height: 1.5;">
            ${address}
          </p>
          ${
            mapsUrl
              ? `<a href="${mapsUrl}" style="font-size: 15px; color: #7c3aed; text-decoration: none; font-weight: 600;">Open in Maps →</a>`
              : ""
          }
          ${
            accessNotes
              ? `<p style="margin: 12px 0 0; font-size: 14px; color: #666; line-height: 1.5;"><em>${accessNotes}</em></p>`
              : ""
          }
        </div>
      `
    : "";

  const addressText = address
    ? `\nDrop off:\n${address}${mapsUrl ? `\n${mapsUrl}` : ""}${accessNotes ? `\nNote: ${accessNotes}` : ""}\n`
    : "";

  // Emergency contact
  const emergencyHtml =
    emergencyContact || emergencyPhone
      ? `
        <p style="margin: 20px 0 0; font-size: 13px; color: #888; line-height: 1.5; text-align: center;">
          In case of emergency: ${emergencyContact ?? ""}${emergencyPhone ? ` · ${emergencyPhone}` : ""}
        </p>
      `
      : "";

  const emergencyText =
    emergencyContact || emergencyPhone
      ? `\nIn case of emergency: ${emergencyContact ?? ""}${emergencyPhone ? ` · ${emergencyPhone}` : ""}`
      : "";

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
                      ${circleName}
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      ${shiftDateShort}: helping ${recipientFirstName}
                    </h1>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">
                      ${opening}
                    </p>

                    ${addressHtml}

                    <div style="margin: 0 0 24px;">
                      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.04em;">
                        ${recipientFirstName}&rsquo;s list
                      </p>
                      ${groceryListHtml}
                    </div>

                    ${rxHtml}

                    <table role="presentation" style="margin: 24px 0 0;">
                      <tr>
                        <td style="background-color: #7c3aed; border-radius: 10px;">
                          <a href="${shiftUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #f7f3ec; text-decoration: none;">
                            Open shift details →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                      Can&rsquo;t make it? Open the shift page and the list will get picked up by someone else in the rotation.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 20px;" />

                    ${emergencyHtml}
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

  const text = `${circleName}

${shiftDateShort}: helping ${recipientFirstName} ${recipientLastName}

${openingText}
${addressText}
${recipientFirstName}'s list:
${groceryListText}
${rxText}
Open shift details: ${shiftUrl}

Can't make it? Open the shift page and the list will get picked up by someone else in the rotation.
${emergencyText}

— Friendship Park Helpers
`;

  return { subject, html, text };
}
