// ============================================================
// Profile Controller — Edit Profile, KYC, Settings
// ============================================================

const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { createNotification } = require('../utils/notify');
const upload = multer({ dest: 'uploads/profiles/', limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /dashboard/profile ─────────────────────────────────
exports.editPage = async (req, res) => {
  try {
    res.render('pages/dashboard-profile', {
      pageTitle: 'Edit Profile',
      activePage: 'profile',
    });
  } catch (err) {
    console.error('Profile edit page error:', err);
    req.flash('error', 'Could not load profile page');
    res.redirect('/dashboard');
  }
};

// ─── POST /dashboard/profile ────────────────────────────────
exports.save = [
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        first_name, last_name, tagline, city, address,
        date_of_birth, gender, bio,
        instagram, facebook, website,
      } = req.body;
      const skills = req.body['skills[]']
        ? (Array.isArray(req.body['skills[]']) ? req.body['skills[]'] : [req.body['skills[]']])
        : [];

      let avatarUrl = req.user.avatar_url;
      let coverUrl = req.user.cover_photo_url;
      const userId = req.user.id;

      // Upload avatar if new file provided
      if (req.files && req.files.avatar) {
        const r = await cloudinary.uploader.upload(req.files.avatar[0].path, {
          folder: 'eventkraft/avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        });
        avatarUrl = r.secure_url;
        fs.unlinkSync(req.files.avatar[0].path);
      }

      // Upload cover if new file provided
      if (req.files && req.files.cover) {
        const r = await cloudinary.uploader.upload(req.files.cover[0].path, {
          folder: 'eventkraft/covers',
          transformation: [{ width: 1200, height: 360, crop: 'fill' }],
        });
        coverUrl = r.secure_url;
        fs.unlinkSync(req.files.cover[0].path);
      }

      const socialLinks = {
        instagram: instagram || null,
        facebook: facebook || null,
        website: website || null,
      };

      // Update profiles table (upsert)
      await pool.query(
        `INSERT INTO profiles
           (user_id, first_name, last_name, avatar_url, cover_photo_url,
            bio, city, address, date_of_birth, gender, social_links)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (user_id) DO UPDATE SET
           first_name       = EXCLUDED.first_name,
           last_name        = EXCLUDED.last_name,
           avatar_url       = EXCLUDED.avatar_url,
           cover_photo_url  = EXCLUDED.cover_photo_url,
           bio              = EXCLUDED.bio,
           city             = EXCLUDED.city,
           address          = EXCLUDED.address,
           date_of_birth    = EXCLUDED.date_of_birth,
           gender           = EXCLUDED.gender,
           social_links     = EXCLUDED.social_links,
           updated_at       = NOW()`,
        [userId, first_name, last_name, avatarUrl, coverUrl,
         bio || null, city || null, address || null,
         date_of_birth || null, gender || null,
         JSON.stringify(socialLinks)]
      );

      // Workers: save tagline + skills to users table
      if (req.user.role === 'worker') {
        await pool.query(
          `UPDATE users SET tagline = $1, skills = $2 WHERE id = $3`,
          [tagline || null, skills, userId]
        );
      }

      req.flash('success', 'Profile updated successfully.');
      res.redirect('/dashboard/profile');

    } catch (err) {
      console.error('Profile save error:', err);
      req.flash('error', 'Something went wrong. Please try again.');
      res.redirect('/dashboard/profile');
    }
  }
];

// ─── GET /dashboard/kyc ─────────────────────────────────────
exports.kycPage = async (req, res) => {
  try {
    const kycResult = await pool.query(
      'SELECT * FROM kyc_submissions WHERE user_id = $1',
      [req.user.id]
    );

    res.render('pages/dashboard-kyc', {
      pageTitle: 'Identity Verification',
      activePage: 'settings',
      kycSubmission: kycResult.rows[0] || null,
    });
  } catch (err) {
    console.error('KYC page error:', err);
    req.flash('error', 'Could not load KYC page');
    res.redirect('/dashboard');
  }
};

// ─── POST /dashboard/kyc/submit ─────────────────────────────
exports.kycSubmit = [
  upload.fields([
    { name: 'doc_front', maxCount: 1 },
    { name: 'doc_back', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { document_type } = req.body;
      const userId = req.user.id;

      if (!req.files || !req.files.doc_front) {
        req.flash('error', 'Please upload the front of your document.');
        return res.redirect('/dashboard/kyc');
      }

      // Upload front (authenticated / private)
      const frontResult = await cloudinary.uploader.upload(req.files.doc_front[0].path, {
        folder: `eventkraft/kyc/${userId}`,
        resource_type: 'auto',
        type: 'authenticated',
      });
      fs.unlinkSync(req.files.doc_front[0].path);

      let backUrl = null, backPublicId = null;
      if (req.files.doc_back) {
        const backResult = await cloudinary.uploader.upload(req.files.doc_back[0].path, {
          folder: `eventkraft/kyc/${userId}`,
          resource_type: 'auto',
          type: 'authenticated',
        });
        backUrl = backResult.secure_url;
        backPublicId = backResult.public_id;
        fs.unlinkSync(req.files.doc_back[0].path);
      }

      // Upsert KYC submission
      await pool.query(
        `INSERT INTO kyc_submissions
           (user_id, document_type, doc_front_url, doc_front_public_id, doc_back_url, doc_back_public_id, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           document_type       = EXCLUDED.document_type,
           doc_front_url       = EXCLUDED.doc_front_url,
           doc_front_public_id = EXCLUDED.doc_front_public_id,
           doc_back_url        = EXCLUDED.doc_back_url,
           doc_back_public_id  = EXCLUDED.doc_back_public_id,
           status              = 'pending',
           rejection_reason    = NULL,
           submitted_at        = NOW()`,
        [userId, document_type, frontResult.secure_url, frontResult.public_id, backUrl, backPublicId]
      );

      // Update user kyc_status
      await pool.query('UPDATE users SET kyc_status = $1 WHERE id = $2', ['pending', userId]);

      // Notify all admins
      const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of admins.rows) {
        await createNotification(pool, req.app.get('io'), {
          userId: admin.id,
          type: 'kyc_submitted',
          title: 'New KYC submission',
          message: `${req.user.first_name || ''} ${req.user.last_name || ''} submitted identity documents.`,
          link: `/admin/kyc`,
        });
      }

      req.flash('success', 'Documents submitted! We\'ll review them within 1–2 business days.');
      res.redirect('/dashboard/kyc');

    } catch (err) {
      console.error('KYC submit error:', err);
      req.flash('error', 'Upload failed. Please try again.');
      res.redirect('/dashboard/kyc');
    }
  }
];

// ─── GET /dashboard/settings ────────────────────────────────
exports.settingsPage = (req, res) => {
  const activeTab = req.query.tab || 'contact';
  res.render('pages/dashboard-settings', {
    pageTitle: 'Account Settings',
    activePage: 'settings',
    activeTab,
  });
};

// ─── POST /dashboard/settings/contact ───────────────────────
exports.saveContact = async (req, res) => {
  try {
    const { email, phone, address } = req.body;
    const fullPhone = phone ? '+977' + phone.replace(/^\+977/, '') : null;
    await pool.query(
      'UPDATE users SET email = $1, phone = $2 WHERE id = $3',
      [email.toLowerCase(), fullPhone, req.user.id]
    );
    if (address !== undefined) {
      await pool.query(
        'UPDATE profiles SET address = $1 WHERE user_id = $2',
        [address || null, req.user.id]
      );
    }
    req.flash('success', 'Contact info updated.');
    res.redirect('/dashboard/settings?tab=contact');
  } catch (err) {
    console.error('Save contact error:', err);
    req.flash('error', 'Could not update contact info.');
    res.redirect('/dashboard/settings?tab=contact');
  }
};

// ─── POST /dashboard/settings/password ──────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/dashboard/settings?tab=security');
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!user.password_hash) {
      req.flash('error', 'This account uses Google login. Set a password by using "Forgot Password".');
      return res.redirect('/dashboard/settings?tab=security');
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/dashboard/settings?tab=security');
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    req.flash('success', 'Password updated successfully.');
    res.redirect('/dashboard/settings?tab=security');
  } catch (err) {
    console.error('Change password error:', err);
    req.flash('error', 'Could not change password.');
    res.redirect('/dashboard/settings?tab=security');
  }
};

// ─── POST /dashboard/settings/notifications ─────────────────
exports.saveNotifications = async (req, res) => {
  try {
    const prefs = {
      email_messages: !!req.body.email_messages,
      email_bookings: !!req.body.email_bookings,
      email_proposals: !!req.body.email_proposals,
      email_reviews: !!req.body.email_reviews,
      email_announcements: !!req.body.email_announcements,
    };
    await pool.query(
      'UPDATE users SET notification_prefs = $1 WHERE id = $2',
      [JSON.stringify(prefs), req.user.id]
    );
    req.flash('success', 'Notification preferences saved.');
    res.redirect('/dashboard/settings?tab=notifications');
  } catch (err) {
    console.error('Save notifications error:', err);
    req.flash('error', 'Could not save preferences.');
    res.redirect('/dashboard/settings?tab=notifications');
  }
};

// ─── POST /dashboard/settings/privacy ───────────────────────
exports.savePrivacy = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET profile_visible = $1, show_phone = $2, open_messaging = $3 WHERE id = $4',
      [!!req.body.profile_visible, !!req.body.show_phone, !!req.body.open_messaging, req.user.id]
    );
    req.flash('success', 'Privacy settings saved.');
    res.redirect('/dashboard/settings?tab=privacy');
  } catch (err) {
    console.error('Save privacy error:', err);
    req.flash('error', 'Could not save settings.');
    res.redirect('/dashboard/settings?tab=privacy');
  }
};

// ─── GET /dashboard/notifications ───────────────────────────
exports.notificationsPage = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    // Mark as read when viewing
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.render('pages/dashboard-notifications', {
      pageTitle: 'Notifications',
      activePage: 'notifications',
      notifications: rows,
    });
  } catch (err) {
    console.error('Notifications page error:', err);
    req.flash('error', 'Could not load notifications.');
    res.redirect('/dashboard');
  }
};

// ─── API: GET /dashboard/notifications/api/recent ─────────────
exports.getRecentNotificationsApi = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Recent notifications API error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// ─── API: POST /dashboard/notifications/api/mark-all-read ─────
exports.markAllAsReadApi = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read API error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// ─── POST /dashboard/settings/deactivate ────────────────────
exports.deactivateAccount = async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
    req.flash('success', 'Account deactivated. You can reactivate by logging in again.');
    req.logout(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Deactivate error:', err);
    req.flash('error', 'Could not deactivate account.');
    res.redirect('/dashboard/settings?tab=security');
  }
};

// ─── POST /dashboard/settings/delete ──────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    req.flash('success', 'Your account has been permanently deleted.');
    req.logout(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Delete account error:', err);
    req.flash('error', 'Could not delete account.');
    res.redirect('/dashboard/settings?tab=security');
  }
};
