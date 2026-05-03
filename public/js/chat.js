// ============================================================
// Chat.js — Real-time messaging via Socket.io
// ============================================================

(function () {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const socket = io();
    const conversationId = container.dataset.conversationId;
    const currentUserId = container.dataset.userId;
    const currentUserName = container.dataset.userName || 'You';
    const messageArea = document.getElementById('messageArea');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    // Join the conversation room
    socket.emit('join-conversation', conversationId);

    // ── SENDING ─────────────────────────────────────
    if (messageForm) {
        messageForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const content = messageInput.value.trim();
            if (!content) return;

            const tempId = 'temp_' + Date.now();

            // 1. Optimistic render
            appendMessage({
                id: tempId,
                content: content,
                sender_id: currentUserId,
                created_at: new Date().toISOString(),
                pending: true
            });
            messageInput.value = '';
            scrollToBottom();

            // 2. Save to DB via fetch
            try {
                const res = await fetch(`/messages/${conversationId}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: content,
                        receiver_id: container.dataset.receiverId
                    })
                });
                const saved = await res.json();

                // 3. Update temp → confirmed
                const tempEl = document.getElementById('msg-' + tempId);
                if (tempEl) {
                    tempEl.id = 'msg-' + saved.id;
                    tempEl.classList.remove('msg-pending');
                }

                // 4. Emit to socket so other user sees it
                socket.emit('send-message', {
                    conversationId: conversationId,
                    id: saved.id,
                    content: content,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    created_at: saved.created_at || new Date().toISOString()
                });
            } catch (err) {
                console.error('Send failed:', err);
                const tempEl = document.getElementById('msg-' + tempId);
                if (tempEl) tempEl.querySelector('.msg-time').textContent = 'Failed to send';
            }
        });
    }

    // ── RECEIVING ────────────────────────────────────
    socket.on('new-message', function (msg) {
        // Don't duplicate own messages (already rendered optimistically)
        if (msg.sender_id === currentUserId) return;
        appendMessage(msg);
        scrollToBottom();
    });

    // ── HELPERS ──────────────────────────────────────
    function appendMessage(msg) {
        const isOwn = msg.sender_id === currentUserId;
        const div = document.createElement('div');
        div.id = 'msg-' + msg.id;
        div.className = 'd-flex mb-3 ' + (isOwn ? 'justify-content-end' : 'justify-content-start') + (msg.pending ? ' msg-pending' : '');
        div.innerHTML =
            '<div class="' + (isOwn ? 'chat-sent' : 'chat-received') + '" style="max-width:70%;padding:.6rem 1rem;border-radius:16px">' +
            '<p class="mb-0" style="font-size:.9rem">' + escapeHtml(msg.content) + '</p>' +
            '<small class="msg-time" style="opacity:.5;font-size:.7rem">' + formatTime(msg.created_at) + (msg.pending ? ' · Sending…' : '') + '</small>' +
            '</div>';
        messageArea.appendChild(div);
    }

    function scrollToBottom() {
        if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function formatTime(iso) {
        try {
            return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    // Scroll to bottom on load
    scrollToBottom();
})();
