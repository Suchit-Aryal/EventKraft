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

async function sendBookingAcceptedEmail(toEmail, booking, deadline) {
    const formattedDeadline = new Date(deadline).toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' });
    const advanceAmount = Math.round(booking.total_amount * 0.30).toLocaleString('en-NP');
    const workerName = `${booking.worker_first_name || ''} ${booking.worker_last_name || ''}`.trim() || 'the worker';
    const gigTitle = booking.gig_title || 'your booked service';

    return transporter.sendMail({
        from: process.env.SMTP_FROM || '"EventKraft" <noreply@eventkraft.com>',
        to: toEmail,
        subject: '⚡ Action Required: Pay Advance to Confirm Your Booking',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #eee">
            <h1 style="color:#6b1d2a;text-align:center">EventKraft</h1>
            <h2>Your booking has been accepted!</h2>
            <p>Great news — <strong>${workerName}</strong> has accepted your booking for <strong>${gigTitle}</strong>.</p>
            <div style="background:#fff3cd;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ffc107">
              <strong>⏰ Action required by: ${formattedDeadline} (Nepal Time)</strong><br/>
              Pay the advance of <strong>NPR ${advanceAmount}</strong> to confirm your booking.
              After this deadline, your booking will be automatically cancelled.
            </div>
            <a href="${process.env.APP_URL}/bookings/${booking.id}/agreement"
               style="background:#6b1d2a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
              Review Terms &amp; Pay Advance
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px;">
              If you did not make this booking, please contact us at support@eventkraft.com
            </p>
          </div>
        `,
    });
}

module.exports.sendBookingAcceptedEmail = sendBookingAcceptedEmail;
