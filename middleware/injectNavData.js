// middleware/injectNavData.js
const db = require('../config/db');
const icons = require('../utils/icons');
const { getProfileCompletion } = require('../utils/profileCompletion');

module.exports = async (req, res, next) => {
  // Always provide icons for sidebar
  res.locals.icons = icons;

  if (!req.user) return next();
  try {
    // Unread message count
    const msgResult = await db.query(
      `SELECT COUNT(*) FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.participant_1 = $1 OR c.participant_2 = $1)
         AND m.sender_id != $1
         AND m.is_read = false`,
      [req.user.id]
    );

    // Unread notification count
    const notifResult = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.locals.unreadMsgs    = parseInt(msgResult.rows[0].count) || 0;
    res.locals.unreadNotifs  = parseInt(notifResult.rows[0].count) || 0;
    res.locals.currentUser   = req.user; // already has profile joined via passport deserialize

    // Profile completion
    res.locals.profileCompletion = getProfileCompletion(req.user);
  } catch (err) {
    console.error('injectNavData error:', err.message);
  }
  next();
};
