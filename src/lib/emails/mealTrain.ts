// lib/emails/mealTrain.ts
//
// Every email a meal train sends:
//   buildMealReminderEmail     → helper, 7 / 2 / 1 days before their day
//   buildMealSignupEmail       → helper, right after they claim day(s)
//   buildMealSignupRecipientEmail → the person RECEIVING the meals, at the
//                                same moment: who's coming, when, and with what
//   buildMealDayReleasedEmail  → organizers (a day reopened) or the helper
//                                (an organizer took them off a day)
//   buildMealOpenDaysEmail     → organizers, when days coming up are unclaimed
//
// Same visual language as the other emails in this folder. All user-entered
// text goes through esc() before it touches HTML.

export function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PURPLE = "#7c3aed";

// ─────────────────────────────────────────────
// Shared pieces
// ─────────────────────────────────────────────

function layout({
  eyebrow,
  headline,
  bodyHtml,
}: {
  eyebrow: string;
  headline: string;
  bodyHtml: string;
}): string {
  return `
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
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: ${PURPLE}; text-transform: uppercase; letter-spacing: 0.08em;">
                      ${esc(eyebrow)}
                    </p>
                    <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #111; line-height: 1.3;">
                      ${esc(headline)}
                    </h1>
                    ${bodyHtml}
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
}

function paragraph(html: string): string {
  return `<p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333;">${html}</p>`;
}

function smallNote(html: string): string {
  return `<p style="margin: 20px 0 0; font-size: 14px; color: #666; line-height: 1.6;">${html}</p>`;
}

function button(label: string, url: string): string {
  return `
    <table role="presentation" style="margin: 24px 0 0;">
      <tr>
        <td style="background-color: ${PURPLE}; border-radius: 10px;">
          <a href="${esc(url)}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #f7f3ec; text-decoration: none;">
            ${esc(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function blockLabel(text: string, color = "#666"): string {
  return `<p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.04em;">${esc(text)}</p>`;
}

export type MealHousehold = {
  householdSize: string | null;
  allergies: string | null;
  preferences: string | null;
};

function householdHtml(recipientFirstName: string, h: MealHousehold): string {
  if (!h.householdSize && !h.allergies && !h.preferences) return "";

  const allergies = h.allergies
    ? `
      <div style="margin: 0 0 12px; padding: 14px 16px; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px;">
        ${blockLabel("Allergies and foods to avoid", "#854d0e")}
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #713f12; white-space: pre-line;">${esc(h.allergies)}</p>
      </div>`
    : "";

  const size = h.householdSize
    ? `<p style="margin: 0 0 8px; font-size: 16px; color: #111; line-height: 1.5;"><strong>Cooking for:</strong> ${esc(h.householdSize)}</p>`
    : "";

  const prefs = h.preferences
    ? `<p style="margin: 0; font-size: 15px; color: #444; line-height: 1.6; white-space: pre-line;"><strong>Good to know:</strong> ${esc(h.preferences)}</p>`
    : "";

  return `
    <div style="margin: 0 0 24px;">
      ${blockLabel(`About ${recipientFirstName}'s household`)}
      ${allergies}
      ${size}
      ${prefs}
    </div>
  `;
}

function householdText(recipientFirstName: string, h: MealHousehold): string {
  if (!h.householdSize && !h.allergies && !h.preferences) return "";
  const lines = [`About ${recipientFirstName}'s household:`];
  if (h.allergies) lines.push(`  Allergies / avoid: ${h.allergies}`);
  if (h.householdSize) lines.push(`  Cooking for: ${h.householdSize}`);
  if (h.preferences) lines.push(`  Good to know: ${h.preferences}`);
  return `\n${lines.join("\n")}\n`;
}

export type MealDropoff = {
  addressOneLine: string | null;
  mapsUrl: string | null;
  accessNotes: string | null;
  dropoffTime: string | null;
};

function dropoffHtml(d: MealDropoff): string {
  if (!d.addressOneLine && !d.accessNotes && !d.dropoffTime) return "";
  return `
    <div style="margin: 0 0 24px; padding: 20px; background: #f7f7f8; border-radius: 10px;">
      ${blockLabel("Drop off")}
      ${d.dropoffTime ? `<p style="margin: 0 0 8px; font-size: 15px; color: #444;">Around <strong>${esc(d.dropoffTime)}</strong></p>` : ""}
      ${d.addressOneLine ? `<p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #111; line-height: 1.5;">${esc(d.addressOneLine)}</p>` : ""}
      ${d.mapsUrl ? `<a href="${esc(d.mapsUrl)}" style="font-size: 15px; color: ${PURPLE}; text-decoration: none; font-weight: 600;">Open in Maps</a>` : ""}
      ${d.accessNotes ? `<p style="margin: 12px 0 0; font-size: 14px; color: #666; line-height: 1.5; white-space: pre-line;"><em>${esc(d.accessNotes)}</em></p>` : ""}
    </div>
  `;
}

function dropoffText(d: MealDropoff): string {
  if (!d.addressOneLine && !d.accessNotes && !d.dropoffTime) return "";
  const lines = ["Drop off:"];
  if (d.dropoffTime) lines.push(`  Around ${d.dropoffTime}`);
  if (d.addressOneLine) lines.push(`  ${d.addressOneLine}`);
  if (d.mapsUrl) lines.push(`  ${d.mapsUrl}`);
  if (d.accessNotes) lines.push(`  Note: ${d.accessNotes}`);
  return `\n${lines.join("\n")}\n`;
}

// ─────────────────────────────────────────────
// 1. Reminder — 7 / 2 / 1 days before
// ─────────────────────────────────────────────

type MealReminderProps = {
  helperFirstName: string;
  recipientFirstName: string;
  circleName: string;
  daysBefore: 7 | 2 | 1;
  shiftDateFull: string; // "Saturday, May 1"
  shiftDateShort: string; // "Tomorrow" | "This Saturday" | "Next Saturday"
  mealDescription: string | null;
  mealNotes: string | null;
  household: MealHousehold;
  dropoff: MealDropoff;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  shiftUrl: string;
};

export function buildMealReminderEmail(p: MealReminderProps) {
  const subject =
    p.daysBefore === 7
      ? `Heads up: you're bringing a meal to ${p.recipientFirstName} next week`
      : p.daysBefore === 2
        ? `You're bringing a meal to ${p.recipientFirstName} ${p.shiftDateShort.toLowerCase()}`
        : `Tomorrow: a meal for ${p.recipientFirstName}`;

  const when = p.daysBefore === 1 ? "tomorrow" : `on ${p.shiftDateFull}`;
  const whenHtml =
    p.daysBefore === 1
      ? "<strong>tomorrow</strong>"
      : `on <strong>${esc(p.shiftDateFull)}</strong>`;
  const tail =
    p.daysBefore === 7
      ? " No action needed yet — this is just so you can plan around it."
      : "";

  const mealHtml = p.mealDescription
    ? `
      <div style="margin: 0 0 24px;">
        ${blockLabel("You're bringing")}
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111; line-height: 1.4;">${esc(p.mealDescription)}</p>
        ${p.mealNotes ? `<p style="margin: 6px 0 0; font-size: 15px; color: #666; line-height: 1.5; white-space: pre-line;">${esc(p.mealNotes)}</p>` : ""}
      </div>`
    : `
      <div style="margin: 0 0 24px; padding: 16px 18px; background: #faf7ff; border: 1px solid #ddd6fe; border-radius: 10px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4c1d95;">
          <strong>You haven&rsquo;t said what you&rsquo;re bringing yet.</strong> Adding it helps everyone else avoid doubling up &mdash; it takes ten seconds.
        </p>
      </div>`;

  const emergencyHtml =
    p.emergencyContact || p.emergencyPhone
      ? `<hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 20px;" />
         <p style="margin: 0; font-size: 13px; color: #888; line-height: 1.5; text-align: center;">
           In case of emergency: ${esc(p.emergencyContact)}${p.emergencyPhone ? ` &middot; ${esc(p.emergencyPhone)}` : ""}
         </p>`
      : "";

  const html = layout({
    eyebrow: p.circleName,
    headline: `${p.shiftDateShort}: a meal for ${p.recipientFirstName}`,
    bodyHtml: `
      ${paragraph(`Hi ${esc(p.helperFirstName)} &mdash; a reminder that you&rsquo;re bringing a meal to ${esc(p.recipientFirstName)} ${whenHtml}.${tail}`)}
      ${mealHtml}
      ${householdHtml(p.recipientFirstName, p.household)}
      ${dropoffHtml(p.dropoff)}
      ${button(p.mealDescription ? "Open your day" : "Add what you're bringing", p.shiftUrl)}
      ${smallNote("Can&rsquo;t make it? Open your day and release it so someone else can take it &mdash; the sooner the better.")}
      ${emergencyHtml}
    `,
  });

  const text = `${p.circleName}

${p.shiftDateShort}: a meal for ${p.recipientFirstName}

Hi ${p.helperFirstName} — a reminder that you're bringing a meal to ${p.recipientFirstName} ${when}.${tail}

${p.mealDescription ? `You're bringing: ${p.mealDescription}${p.mealNotes ? `\n  ${p.mealNotes}` : ""}` : "You haven't said what you're bringing yet. Adding it helps everyone else avoid doubling up."}
${householdText(p.recipientFirstName, p.household)}${dropoffText(p.dropoff)}
Open your day: ${p.shiftUrl}

Can't make it? Open your day and release it so someone else can take it.
${p.emergencyContact || p.emergencyPhone ? `\nIn case of emergency: ${p.emergencyContact ?? ""}${p.emergencyPhone ? ` · ${p.emergencyPhone}` : ""}\n` : ""}
— Friendship Park Helpers
`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────
// 2. Sign-up confirmation
// ─────────────────────────────────────────────

type MealSignupProps = {
  helperFirstName: string;
  recipientFirstName: string;
  circleName: string;
  days: {
    dateFull: string;
    mealDescription: string | null;
    url: string;
  }[];
  household: MealHousehold;
  dropoff: MealDropoff;
  circleUrl: string;
};

export function buildMealSignupEmail(p: MealSignupProps) {
  const one = p.days.length === 1;
  const subject = one
    ? `You're signed up: a meal for ${p.recipientFirstName} on ${p.days[0].dateFull}`
    : `You're signed up for ${p.days.length} days of meals for ${p.recipientFirstName}`;

  const daysHtml = p.days
    .map(
      (d) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <a href="${esc(d.url)}" style="font-size: 16px; font-weight: 700; color: #111; text-decoration: none;">${esc(d.dateFull)}</a>
            <p style="margin: 4px 0 0; font-size: 15px; color: ${d.mealDescription ? "#444" : "#888"}; line-height: 1.5;">
              ${d.mealDescription ? esc(d.mealDescription) : "<em>Meal not added yet</em>"}
            </p>
          </td>
        </tr>`,
    )
    .join("");

  const html = layout({
    eyebrow: p.circleName,
    headline: one
      ? "You're on the calendar"
      : `You're on the calendar ${p.days.length} times`,
    bodyHtml: `
      ${paragraph(`Thank you, ${esc(p.helperFirstName)}. Here&rsquo;s what you signed up for &mdash; we&rsquo;ll send a reminder as each day gets close.`)}
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        ${daysHtml}
      </table>
      ${householdHtml(p.recipientFirstName, p.household)}
      ${dropoffHtml(p.dropoff)}
      ${button("See the full calendar", p.circleUrl)}
      ${smallNote("Plans change. If you can&rsquo;t make a day, open it and release it so someone else can step in.")}
    `,
  });

  const text = `${p.circleName}

Thank you, ${p.helperFirstName}. Here's what you signed up for — we'll send a reminder as each day gets close.

${p.days.map((d) => `  • ${d.dateFull} — ${d.mealDescription ?? "meal not added yet"}\n    ${d.url}`).join("\n")}
${householdText(p.recipientFirstName, p.household)}${dropoffText(p.dropoff)}
Full calendar: ${p.circleUrl}

Plans change. If you can't make a day, open it and release it so someone else can step in.

— Friendship Park Helpers
`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────
// 2b. "Someone signed up" → the person receiving the meals
// ─────────────────────────────────────────────

type MealSignupRecipientProps = {
  recipientFirstName: string;
  helperFirstName: string;
  helperLastName: string;
  /** Already formatted for display, e.g. "(555) 123-4567". */
  helperPhone: string | null;
  circleName: string;
  days: {
    dateFull: string;
    mealDescription: string | null;
    mealNotes: string | null;
  }[];
  dropoffTime: string | null;
  /** Their own page, where the whole calendar lives. */
  pageUrl: string;
};

export function buildMealSignupRecipientEmail(p: MealSignupRecipientProps) {
  const one = p.days.length === 1;
  const helperName = `${p.helperFirstName} ${p.helperLastName}`.trim();

  const subject = one
    ? `${p.helperFirstName} is bringing you a meal on ${p.days[0].dateFull}`
    : `${p.helperFirstName} signed up to bring you ${p.days.length} meals`;

  const daysHtml = p.days
    .map(
      (d) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111;">${esc(d.dateFull)}</p>
            <p style="margin: 4px 0 0; font-size: 15px; color: ${d.mealDescription ? "#444" : "#888"}; line-height: 1.5;">
              ${d.mealDescription ? esc(d.mealDescription) : `<em>${esc(p.helperFirstName)} hasn&rsquo;t said what yet</em>`}
            </p>
            ${d.mealNotes ? `<p style="margin: 4px 0 0; font-size: 14px; color: #777; line-height: 1.5; white-space: pre-line;">${esc(d.mealNotes)}</p>` : ""}
          </td>
        </tr>`,
    )
    .join("");

  const anyMealMissing = p.days.some((d) => !d.mealDescription);

  const html = layout({
    eyebrow: p.circleName,
    headline: one
      ? `${p.helperFirstName} is bringing you a meal`
      : `${p.helperFirstName} is bringing you ${p.days.length} meals`,
    bodyHtml: `
      ${paragraph(`Hi ${esc(p.recipientFirstName)} &mdash; good news. <strong>${esc(helperName)}</strong> just signed up:`)}
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        ${daysHtml}
      </table>
      ${p.dropoffTime ? paragraph(`Expect ${one ? "it" : "them"} around <strong>${esc(p.dropoffTime)}</strong>.`) : ""}
      ${p.helperPhone ? paragraph(`${esc(p.helperFirstName)}&rsquo;s number, in case plans change: <strong>${esc(p.helperPhone)}</strong>`) : ""}
      ${button("See who's coming", p.pageUrl)}
      ${smallNote(`${anyMealMissing ? `When ${esc(p.helperFirstName)} adds what ${one ? "it is" : "they&rsquo;re bringing"}, it&rsquo;ll show up on your page. ` : ""}Need to update your allergies or how many people are eating? You can do that on your page too.`)}
    `,
  });

  const text = `${p.circleName}

Hi ${p.recipientFirstName} — good news. ${helperName} just signed up to bring you ${one ? "a meal" : `${p.days.length} meals`}:

${p.days.map((d) => `  • ${d.dateFull} — ${d.mealDescription ?? `${p.helperFirstName} hasn't said what yet`}${d.mealNotes ? `\n    ${d.mealNotes}` : ""}`).join("\n")}
${p.dropoffTime ? `\nExpect ${one ? "it" : "them"} around ${p.dropoffTime}.\n` : ""}${p.helperPhone ? `\n${p.helperFirstName}'s number, in case plans change: ${p.helperPhone}\n` : ""}
See who's coming: ${p.pageUrl}

— Friendship Park Helpers
`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────
// 3. A claimed day was released
// ─────────────────────────────────────────────

type MealDayReleasedProps =
  | {
      audience: "organizer";
      toFirstName: string;
      helperName: string; // who gave the day back
      recipientFirstName: string;
      circleName: string;
      dateFull: string;
      circleUrl: string;
      joinUrl: string | null;
    }
  | {
      audience: "helper";
      toFirstName: string;
      organizerFirstName: string; // who removed them
      recipientFirstName: string;
      circleName: string;
      dateFull: string;
      circleUrl: string;
    };

export function buildMealDayReleasedEmail(p: MealDayReleasedProps) {
  if (p.audience === "helper") {
    const subject = `You've been taken off ${p.dateFull}`;
    const html = layout({
      eyebrow: p.circleName,
      headline: `${p.dateFull} is no longer yours`,
      bodyHtml: `
        ${paragraph(`Hi ${esc(p.toFirstName)} &mdash; ${esc(p.organizerFirstName)} took you off the meal calendar for <strong>${esc(p.dateFull)}</strong>, so you don&rsquo;t need to bring anything that day.`)}
        ${paragraph(`If that&rsquo;s a surprise, check with ${esc(p.organizerFirstName)}. Any other days you signed up for are unchanged.`)}
        ${button("See the calendar", p.circleUrl)}
      `,
    });
    const text = `${p.circleName}

Hi ${p.toFirstName} — ${p.organizerFirstName} took you off the meal calendar for ${p.dateFull}, so you don't need to bring anything that day.

If that's a surprise, check with ${p.organizerFirstName}. Any other days you signed up for are unchanged.

Calendar: ${p.circleUrl}

— Friendship Park Helpers
`;
    return { subject, html, text };
  }

  const subject = `${p.dateFull} is open again — ${p.recipientFirstName}'s meals`;
  const html = layout({
    eyebrow: p.circleName,
    headline: `${p.dateFull} needs someone`,
    bodyHtml: `
      ${paragraph(`Hi ${esc(p.toFirstName)} &mdash; ${esc(p.helperName)} can no longer bring a meal on <strong>${esc(p.dateFull)}</strong>, so that day is open again.`)}
      ${p.joinUrl ? paragraph(`The quickest fix is usually to re-share the sign-up link with your group:<br /><a href="${esc(p.joinUrl)}" style="color: ${PURPLE}; font-weight: 600; word-break: break-all;">${esc(p.joinUrl)}</a>`) : ""}
      ${button("Open the calendar", p.circleUrl)}
    `,
  });
  const text = `${p.circleName}

Hi ${p.toFirstName} — ${p.helperName} can no longer bring a meal on ${p.dateFull}, so that day is open again.
${p.joinUrl ? `\nThe quickest fix is usually to re-share the sign-up link with your group:\n${p.joinUrl}\n` : ""}
Calendar: ${p.circleUrl}

— Friendship Park Helpers
`;
  return { subject, html, text };
}

// ─────────────────────────────────────────────
// 4. Open days coming up (to organizers)
// ─────────────────────────────────────────────

type MealOpenDaysProps = {
  toFirstName: string;
  recipientFirstName: string;
  circleName: string;
  openDays: { dateFull: string; relative: string }[]; // soonest first
  circleUrl: string;
  joinUrl: string | null;
};

export function buildMealOpenDaysEmail(p: MealOpenDaysProps) {
  const soonest = p.openDays[0];
  const count = p.openDays.length;
  const subject =
    count === 1
      ? `No one is bringing ${p.recipientFirstName} a meal ${soonest.relative.toLowerCase()} yet`
      : `${count} days coming up still need a meal for ${p.recipientFirstName}`;

  const listHtml = p.openDays
    .map(
      (d) =>
        `<li><strong>${esc(d.dateFull)}</strong> <span style="color: #888;">(${esc(d.relative.toLowerCase())})</span></li>`,
    )
    .join("");

  const html = layout({
    eyebrow: p.circleName,
    headline:
      count === 1
        ? `${soonest.relative} is still open`
        : `${count} days are still open`,
    bodyHtml: `
      ${paragraph(`Hi ${esc(p.toFirstName)} &mdash; nobody has signed up to bring ${esc(p.recipientFirstName)} a meal on:`)}
      <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #333;">${listHtml}</ul>
      ${p.joinUrl ? paragraph(`Re-sharing the sign-up link usually does it:<br /><a href="${esc(p.joinUrl)}" style="color: ${PURPLE}; font-weight: 600; word-break: break-all;">${esc(p.joinUrl)}</a>`) : ""}
      ${button("Open the calendar", p.circleUrl)}
      ${smallNote("You&rsquo;re getting this because you organize this meal train. We only send it when a day that&rsquo;s close is still unclaimed.")}
    `,
  });

  const text = `${p.circleName}

Hi ${p.toFirstName} — nobody has signed up to bring ${p.recipientFirstName} a meal on:

${p.openDays.map((d) => `  • ${d.dateFull} (${d.relative.toLowerCase()})`).join("\n")}
${p.joinUrl ? `\nRe-sharing the sign-up link usually does it:\n${p.joinUrl}\n` : ""}
Calendar: ${p.circleUrl}

— Friendship Park Helpers
`;

  return { subject, html, text };
}
