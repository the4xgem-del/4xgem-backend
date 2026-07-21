"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.verificationEmailHtml = verificationEmailHtml;
exports.passwordResetEmailHtml = passwordResetEmailHtml;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const transporter = env_1.env.SMTP_HOST
    ? nodemailer_1.default.createTransport({
        host: env_1.env.SMTP_HOST,
        port: env_1.env.SMTP_PORT ?? 587,
        auth: env_1.env.SMTP_USER ? { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS } : undefined,
    })
    : null;
/**
 * Sends transactional email via SMTP (SES, Postmark, SendGrid — anything
 * SMTP-compatible works by just setting SMTP_* env vars).
 * Falls back to logging in development so local auth flows still work
 * without real SMTP credentials configured.
 */
async function sendEmail({ to, subject, html }) {
    if (!transporter) {
        if (env_1.isProd) {
            logger_1.logger.error("SMTP not configured in production — email not sent");
            throw new Error("Email service not configured");
        }
        logger_1.logger.info({ to, subject, html }, "📧 [dev mode] Email not actually sent — logged instead");
        return;
    }
    await transporter.sendMail({ from: env_1.env.EMAIL_FROM, to, subject, html });
}
function verificationEmailHtml(link) {
    return `<p>Welcome to 4xGem. Please verify your email address by clicking the link below:</p>
<p><a href="${link}">Verify my email</a></p>
<p>This link expires in 24 hours.</p>`;
}
function passwordResetEmailHtml(link) {
    return `<p>We received a request to reset your 4xGem password.</p>
<p><a href="${link}">Reset my password</a></p>
<p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`;
}
//# sourceMappingURL=mailer.js.map