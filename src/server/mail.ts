import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  transport ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transport;
}

const layout = (title: string, body: string, cta?: { href: string; label: string }) => `
<div style="font-family:Arial,sans-serif;background:#f8f7f1;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e6dfcc">
    <h2 style="color:#3e6b4a;margin:0 0 12px">${title}</h2>
    <div style="color:#4a4a4a;line-height:1.6">${body}</div>
    ${cta ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#3e6b4a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">${cta.label}</a></p>
    <p style="color:#888;font-size:12px">Nếu nút không hoạt động, mở liên kết: ${cta.href}</p>` : ""}
    <p style="color:#888;font-size:12px;margin-top:24px">Gỡ Rối Tâm · Nếu bạn không yêu cầu email này, hãy bỏ qua.</p>
  </div>
</div>`;

/**
 * Production requires SMTP_* settings. In development without SMTP the message is printed
 * to the server console so the full flow (including the link) can still be exercised.
 */
export async function sendMail(to: string, subject: string, title: string, body: string, cta?: { href: string; label: string }) {
  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    console.info(`\n──── DEV MAIL (SMTP chưa cấu hình) ────\nTo: ${to}\nSubject: ${subject}\n${cta ? `Link: ${cta.href}\n` : ""}───────────────────────────────────────\n`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, html: layout(title, body, cta) });
}
