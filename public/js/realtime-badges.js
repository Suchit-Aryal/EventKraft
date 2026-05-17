/**
 * Real-time badge updates for navbar notifications & messages.
 * Connects to Socket.io and listens for personal events.
 */
(function () {
  const notifBadge = document.getElementById('notif-badge');
  const msgBadge   = document.getElementById('msg-badge');

  try {
    if (typeof io === 'undefined') return;
    const socket = window.socket || io();
    if (!window.socket) window.socket = socket;

    // Join personal room if logged in
    if (window.CURRENT_USER_ID) {
      socket.emit('join-user', window.CURRENT_USER_ID);
    }

    socket.on('new-notification', function (data) {
      if (notifBadge) {
        const current = parseInt(notifBadge.textContent) || 0;
        const next = current + 1;
        notifBadge.textContent = next > 9 ? '9+' : next;
        notifBadge.classList.remove('d-none');
      }
    });

    socket.on('new-message-badge', function (data) {
      if (msgBadge) {
        // Only increment if not already on the conversation page for THIS message
        const path = window.location.pathname;
        const conversationId = data.conversation_id || data.conversationId;
        if (conversationId && path === '/messages/' + conversationId) return;

        const current = parseInt(msgBadge.textContent) || 0;
        const next = current + 1;
        msgBadge.textContent = next > 9 ? '9+' : next;
        msgBadge.classList.remove('d-none');
      }
    });
  } catch (err) {
    console.error('realtime-badges socket error:', err);
  }
})();
