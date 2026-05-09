/**
 * Notifications & Messages Navbar Popups - DEFINITIVE LOGIC (V2)
 */
(function() {
  const notifWrapper = document.getElementById('notif-wrapper');
  const msgWrapper   = document.getElementById('msg-wrapper');
  const notifList    = document.getElementById('notif-list');
  const msgPopList   = document.getElementById('msg-pop-list');
  const clearAllBtn  = document.getElementById('clear-all-notifs');
  const notifBadge   = document.getElementById('notif-badge');
  const msgBadge     = document.getElementById('msg-badge');

  let notifLoading = false;
  let msgLoading   = false;

  /**
   * Fetches recent notifications and updates the notifications dropdown.
   *
   * If a fetch is already in progress, the function returns immediately. While active it sets an internal loading flag; on success it replaces the dropdown contents with the fetched notifications, and on failure it logs an error and replaces the dropdown contents with a failure message.
   */

  async function fetchNotifications() {
    if (notifLoading) return;
    notifLoading = true;
    
    try {
      const res = await fetch('/dashboard/notifications/api/recent');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      renderNotifications(data);
    } catch (err) {
      console.error('Notif fetch error:', err);
      if (notifList) notifList.innerHTML = '<div class="topnav__dropdown-empty text-danger">Failed to load notifications.</div>';
    } finally {
      notifLoading = false;
    }
  }

  /**
   * Render a list of recent notifications into the notifications dropdown.
   *
   * If the notifications container is not present, the function is a no-op.
   * When `items` is empty or falsy, displays a "No new notifications" message.
   * Each notification is rendered as a link (falls back to `#` if no `link`),
   * includes title, message, and a formatted time, and receives the `is-unread`
   * CSS class when `is_read` is falsy.
   *
   * @param {Array<Object>} items - Array of notification objects to render. Each object may include `title`, `message`, `link`, `is_read`, and `created_at`.
   */
  function renderNotifications(items) {
    if (!notifList) return;
    
    if (!items || items.length === 0) {
      notifList.innerHTML = '<div class="topnav__dropdown-empty">No new notifications</div>';
      return;
    }

    notifList.innerHTML = items.map(n => `
      <a href="${n.link || '#'}" class="topnav__dropdown-item-link ${n.is_read ? '' : 'is-unread'}">
        <span class="notif-item__title">${n.title}</span>
        <span class="notif-item__msg">${n.message || ''}</span>
        <span class="notif-item__time">${formatDate(n.created_at)}</span>
      </a>
    `).join('');
  }

  if (notifWrapper) {
    notifWrapper.addEventListener('mouseenter', fetchNotifications);
    // Also fetch on click for mobile
    notifWrapper.addEventListener('click', fetchNotifications);
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await fetch('/dashboard/notifications/api/mark-all-read', { method: 'POST' });
        if (notifList) notifList.innerHTML = '<div class="topnav__dropdown-empty">Notifications cleared.</div>';
        if (notifBadge) {
          notifBadge.textContent = '0';
          notifBadge.classList.add('d-none');
        }
      } catch (err) {
        console.error('Clear all error:', err);
      }
    });
  }

  /**
   * Fetches recent conversations and updates the messages dropdown.
   *
   * Initiates a network request to "/messages/api/recent" and, on success, parses the JSON response and calls `renderMessages` to populate the dropdown. Uses the `msgLoading` flag to prevent concurrent requests. On error, logs the failure to the console and, if the `msgPopList` element exists, replaces its contents with a failure message.
   */

  async function fetchMessages() {
    if (msgLoading) return;
    msgLoading = true;
    
    try {
      const res = await fetch('/messages/api/recent');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      renderMessages(data);
    } catch (err) {
      console.error('Msg fetch error:', err);
      if (msgPopList) msgPopList.innerHTML = '<div class="topnav__dropdown-empty text-danger">Failed to load messages.</div>';
    } finally {
      msgLoading = false;
    }
  }

  /**
   * Render recent conversations into the messages dropdown.
   *
   * Updates the dropdown container's HTML to show each conversation as a link with the other participant's
   * avatar, name, and a message snippet. If `items` is missing or empty, replaces the content with
   * "No recent messages".
   *
   * @param {Array<Object>} items - Array of conversation objects. Each object is expected to include:
   *   - id: conversation identifier used to build the message link
   *   - participant_1: id of the first participant (compared to window.CURRENT_USER_ID to determine the other)
   *   - p1_name, p1_avatar: name and avatar URL for participant 1
   *   - p2_name, p2_avatar: name and avatar URL for participant 2
   *   - last_message: latest message text (optional)
   */
  function renderMessages(items) {
    if (!msgPopList) return;

    if (!items || items.length === 0) {
      msgPopList.innerHTML = '<div class="topnav__dropdown-empty">No recent messages</div>';
      return;
    }

    const currentUserId = String(window.CURRENT_USER_ID);

    msgPopList.innerHTML = items.map(c => {
      const otherName = String(c.participant_1) === currentUserId ? c.p2_name : c.p1_name;
      const otherAvatar = String(c.participant_1) === currentUserId ? c.p2_avatar : c.p1_avatar;
      
      return `
        <a href="/messages/${c.id}" class="topnav__dropdown-item-link">
          <div class="msg-item">
            <img src="${otherAvatar || '/images/default-avatar.png'}" class="msg-item__avatar">
            <div class="msg-item__info">
              <span class="msg-item__name">${otherName || 'User'}</span>
              <span class="msg-item__snippet">${c.last_message || 'New conversation'}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  if (msgWrapper) {
    msgWrapper.addEventListener('mouseenter', fetchMessages);
    msgWrapper.addEventListener('click', fetchMessages);
  }

  /**
   * Format a date into a compact, human-friendly relative timestamp.
   * @param {string|Date|number|null|undefined} dateStr - Date input as an ISO string, Date object, or Unix timestamp; may be falsy.
   * @returns {string} A relative time string: `'Just now'`, `'<m>m ago'`, `'<h>h ago'`, a locale date string for older dates, or an empty string if `dateStr` is falsy.
   */

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return date.toLocaleDateString();
  }

  // Real-time cache invalidation
  try {
    if (typeof io !== 'undefined') {
      const socket = window.socket || io();
      if (!window.socket) window.socket = socket;
      socket.on('new-notification', () => { /* optional auto-refresh logic */ });
    }
  } catch(e) {}

})();
