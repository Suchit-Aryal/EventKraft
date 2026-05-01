// ============================================================
// Mailer Configuration — Nodemailer for email verification
// ============================================================

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendVerificationEmail(to, code) {
    return transporter.sendMail({
        from: process.env.SMTP_FROM || '"EventKraft" <noreply@eventkraft.com>',
        to,
        subject: 'Verify your EventKraft account',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #eee"><h1 style="color:#6b1d2a;text-align:center">EventKraft</h1><h2 style="text-align:center">Verify your email</h2><p style="text-align:center">Enter this code:</p><div style="text-align:center;margin:24px 0"><span style="display:inline-block;background:linear-gradient(135deg,#6b1d2a,#8c3a4a);color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:12px">${code}</span></div><p style="color:#999;text-align:center;font-size:12px">Expires in 10 minutes.</p></div>`
    });
}

async function send2FAEnabledEmail(to) {
    return transporter.sendMail({
        from: process.env.SMTP_FROM || '"EventKraft" <noreply@eventkraft.com>',
        to,
        subject: 'Two-factor authentication enabled — EventKraft',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #eee"><h1 style="color:#6b1d2a;text-align:center">EventKraft</h1><h2 style="text-align:center">2FA enabled ✅</h2><p style="text-align:center">Your account now requires an authenticator app code when logging in.</p></div>`
    });
}

module.exports = { sendVerificationEmail, send2FAEnabledEmail, transporter };
