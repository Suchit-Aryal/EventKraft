/**
 * Create a notification record and emit via Socket.io if available.
 * @param {object} db     – pg pool
 * @param {object} io     – socket.io server instance (may be null)
 * @param {object} opts   – { userId, type, title, message, link }
 */
async function createNotification(db, io, { userId, type, title, message, link }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message || null, link || null]
    );

    // Emit via socket if available
    if (io) {
      io.to(`user_${userId}`).emit('new-notification', { type, title, message, link });
    }
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
}

module.exports = { createNotification };
