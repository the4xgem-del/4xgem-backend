import nodemailer from "nodemailer";
import { env, isProd } from "@/config/env";
import { logger } from "@/utils/logger";

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email via SMTP (SES, Postmark, SendGrid — anything
 * SMTP-compatible works by just setting SMTP_* env vars).
 * Falls back to logging in development so local auth flows still work
 * without real SMTP credentials configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  if (!transporter) {
    if (isProd) {
      logger.error("SMTP not configured in production — email not sent");
      throw new Error("Email service not configured");
    }
    logger.info({ to, subject, html }, "📧 [dev mode] Email not actually sent — logged instead");
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

export function verificationEmailHtml(link: string): string {
  return `<p>Welcome to 4xGem. Please verify your email address by clicking the link below:</p>
<p><a href="${link}">Verify my email</a></p>
<p>This link expires in 24 hours.</p>`;
}

export function passwordResetEmailHtml(link: string): string {
  return `<p>We received a request to reset your 4xGem password.</p>
<p><a href="${link}">Reset my password</a></p>
<p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`;
}
