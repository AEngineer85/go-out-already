import express from "express";
import { runCrawl } from "./index";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.CRAWLER_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/run", authMiddleware, async (_req, res) => {
  console.log("[server] Manual crawl triggered");
  res.json({ message: "Crawl started" });

  // Run async after responding
  runCrawl()
    .then(async (result) => {
      if (result.eventsFound === 0 || result.errors.length > 0) {
        await sendAlert(result);
      }
    })
    .catch(async (err) => {
      console.error("[server] Crawl error:", err);
      await sendAlert({ eventsFound: 0, eventsNew: 0, sourcesTotal: 0, sourcesSuccess: 0, errors: [err.message] });
    });
});

async function sendAlert(result: {
  eventsFound: number;
  eventsNew: number;
  sourcesTotal: number;
  sourcesSuccess: number;
  errors: string[];
}) {
  const alertEmail = process.env.ALERT_EMAIL_TO || process.env.ALERT_EMAIL_FROM;
  if (!alertEmail) return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ALERT_EMAIL_FROM,
        pass: process.env.ALERT_EMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: alertEmail,
      subject: `[Go Out Already] Crawl alert — ${new Date().toISOString()}`,
      text: `
Crawl Alert
===========
Timestamp: ${new Date().toISOString()}
Sources: ${result.sourcesSuccess}/${result.sourcesTotal} succeeded
Events found: ${result.eventsFound}
Events new: ${result.eventsNew}

Errors:
${result.errors.join("\n") || "None"}
      `.trim(),
    });
  } catch (err) {
    console.error("[server] Failed to send alert email:", err);
  }
}

app.listen(PORT, () => {
  console.log(`[crawler server] Listening on port ${PORT}`);
});
