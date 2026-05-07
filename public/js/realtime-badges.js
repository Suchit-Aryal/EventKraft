/**
 * Real-time badge updates for navbar notifications & messages.
 * Connects to Socket.io and listens for new-notification events.
 */
(function () {
  const notifBadge = document.getElementById('notif-badge');
  const msgBadge   = document.getElementById('msg-badge');

  try {
    const socket = io();

    socket.on('new-notification', function (data) {
      if (notifBadge) {
        const current = parseInt(notifBadge.textContent) || 0;
        const next = current + 1;
        notifBadge.textContent = next > 9 ? '9+' : next;
        notifBadge.classList.remove('is-hidden');
      }
    });

    socket.on('new-message', function (data) {
      if (msgBadge) {
        const current = parseInt(msgBadge.textContent) || 0;
        const next = current + 1;
        msgBadge.textContent = next > 9 ? '9+' : next;
        msgBadge.classList.remove('is-hidden');
      }
    });
  } catch (err) {
    console.error('realtime-badges socket error:', err);
  }
})();
