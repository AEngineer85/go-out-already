import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL_FROM,
    pass: process.env.ALERT_EMAIL_APP_PASSWORD,
  },
});

export async function sendCrawlFailureAlert(params: {
  to: string;
  timestamp: Date;
  sourcesAttempted: number;
  sourcesSucceeded: number;
  eventsFound: number;
  errorMessage?: string;
  stackTrace?: string;
}) {
  const subject = `[Go Out Already] Crawl failure — ${params.timestamp.toISOString()}`;
  const body = `
Crawl Failure Alert
===================
Timestamp: ${params.timestamp.toISOString()}
Sources attempted: ${params.sourcesAttempted}
Sources succeeded: ${params.sourcesSucceeded}
Events found: ${params.eventsFound}

${params.errorMessage ? `Error: ${params.errorMessage}` : ""}
${params.stackTrace ? `\nStack trace:\n${params.stackTrace}` : ""}
  `.trim();

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_FROM,
    to: params.to,
    subject,
    text: body,
  });
}
