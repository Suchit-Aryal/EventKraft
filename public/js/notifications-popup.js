/**
 * Notifications & Messages Navbar Popups - DEFINITIVE LOGIC (V3 - Click based)
 */
(function() {
  const notifWrapper = document.getElementById('notif-wrapper');
  const msgWrapper   = document.getElementById('msg-wrapper');
  const userMenu     = document.getElementById('user-menu');
  
  const notifList    = document.getElementById('notif-list');
  const msgPopList   = document.getElementById('msg-pop-list');
  const clearAllBtn  = document.getElementById('clear-all-notifs');
  const notifBadge   = document.getElementById('notif-badge');
  const msgBadge     = document.getElementById('msg-badge');

  let notifLoading = false;
  let msgLoading   = false;

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

  // Toggler helper
  function setupToggler(wrapper, fetchFn) {
    if (!wrapper) return;
    
    // The trigger is either the icon button or the wrapper itself (for user menu)
    const trigger = wrapper.querySelector('.topnav__icon-btn') || wrapper;
    
    trigger.addEventListener('click', (e) => {
      // Check if we clicked the trigger or its children, but NOT the dropdown itself
      const clickedDropdown = e.target.closest('.topnav__dropdown');
      if (!clickedDropdown) {
        e.preventDefault();
        e.stopPropagation();
        
        const isActive = wrapper.classList.contains('is-active');
        closeAllDropdowns();
        
        if (!isActive) {
          wrapper.classList.add('is-active');
          if (fetchFn) fetchFn();
        }
      }
    });
  }

  function closeAllDropdowns() {
    [notifWrapper, msgWrapper, userMenu].forEach(w => w && w.classList.remove('is-active'));
  }

  setupToggler(notifWrapper, fetchNotifications);
  setupToggler(msgWrapper, fetchMessages);
  setupToggler(userMenu);

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topnav__icon-wrapper') && !e.target.closest('.topnav__user')) {
      closeAllDropdowns();
    }
  });

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

})();
