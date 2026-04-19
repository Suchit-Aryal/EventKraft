// ============================================================
// Message Model — Full CRUD for messages & conversations
// ============================================================

const pool = require('../config/db');

const Message = {

    // ─── CONVERSATIONS ──────────────────────────────────────

    async getOrCreateConversation(user1Id, user2Id, bookingId, jobId) {
        let result = await pool.query(
            `SELECT * FROM conversations
             WHERE (participant_1 = $1 AND participant_2 = $2)
                OR (participant_1 = $2 AND participant_2 = $1)
             LIMIT 1`,
            [user1Id, user2Id]
        );

        if (result.rows.length > 0) return result.rows[0];

        result = await pool.query(
            `INSERT INTO conversations (participant_1, participant_2, booking_id, job_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [user1Id, user2Id, bookingId || null, jobId || null]
        );
        return result.rows[0];
    },

    async getConversations(userId) {
        const result = await pool.query(
            `SELECT c.*,
                    p1.first_name AS p1_name, p1.avatar_url AS p1_avatar,
                    p2.first_name AS p2_name, p2.avatar_url AS p2_avatar,
                    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_id = $1 AND is_read = false) AS unread_count
             FROM conversations c
             LEFT JOIN profiles p1 ON c.participant_1 = p1.user_id
             LEFT JOIN profiles p2 ON c.participant_2 = p2.user_id
             WHERE c.participant_1 = $1 OR c.participant_2 = $1
             ORDER BY c.last_message_at DESC NULLS LAST`,
            [userId]
        );
        return result.rows;
    },

    async getConversationById(conversationId) {
        const result = await pool.query(
            `SELECT c.*,
                    p1.first_name AS p1_name, p2.first_name AS p2_name
             FROM conversations c
             LEFT JOIN profiles p1 ON c.participant_1 = p1.user_id
             LEFT JOIN profiles p2 ON c.participant_2 = p2.user_id
             WHERE c.id = $1`,
            [conversationId]
        );
        return result.rows[0];
    },

    // ─── MESSAGES — CREATE ──────────────────────────────────

    async send({ conversationId, senderId, receiverId, content, attachments }) {
        const result = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, receiver_id, content, attachments)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [conversationId, senderId, receiverId, content, JSON.stringify(attachments || [])]
        );

        await pool.query(
            'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
            [conversationId]
        );

        return result.rows[0];
    },

    // ─── MESSAGES — READ ────────────────────────────────────

    async getByConversation(conversationId, limit = 50, offset = 0) {
        const result = await pool.query(
            `SELECT m.*,
                    p.first_name AS sender_name, p.avatar_url AS sender_avatar
             FROM messages m
             LEFT JOIN profiles p ON m.sender_id = p.user_id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );
        return result.rows;
    },

    async getTotalUnread(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false',
            [userId]
        );
        return parseInt(result.rows[0].count);
    },

    // ─── MESSAGES — UPDATE ──────────────────────────────────

    async markAsRead(conversationId, userId) {
        await pool.query(
            `UPDATE messages SET is_read = true
             WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false`,
            [conversationId, userId]
        );
    },

    // ─── MESSAGES — DELETE ──────────────────────────────────

    async deleteMessage(id) {
        await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    },

    async deleteConversation(conversationId) {
        await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
        await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
    }
};

module.exports = Message;
