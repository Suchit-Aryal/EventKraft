/**
 * Instagram/Facebook-style Floating Chat System
 * Opens from the topnav messages dropdown — supports minimize, close, enlarge
 */
(function() {
  // ─── DOM Setup ──────────────────────────────────────────────
  const container = document.createElement('div');
  container.className = 'floating-chat-container';
  document.body.appendChild(container);

  const minimizedContainer = document.createElement('div');
  minimizedContainer.className = 'minimized-chats';
  document.body.appendChild(minimizedContainer);

  const activeChats = new Map();     // conversationId → DOM element
  const minimizedChats = new Map();  // conversationId → { name, avatar, element, unread }
  const MAX_CHATS = 3;

  // ─── Socket Setup ──────────────────────────────────────────
  let socket = null;
  try {
    if (typeof io !== 'undefined') {
      socket = window.socket || io();
      if (!window.socket) window.socket = socket;
    }
  } catch(e) {}

  // ─── SVG Icon Helpers ──────────────────────────────────────
  const ICONS = {
    minimize: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    expand: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    x: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  // ─── PUBLIC API ────────────────────────────────────────────

  /**
   * Open a floating chat for a conversation. Called from navbar dropdown clicks.
   * @param {string} conversationId 
   * @param {string} otherName 
   * @param {string} otherAvatar 
   */
  window.openFloatingChat = async function(conversationId, otherName, otherAvatar) {
    if (activeChats.has(conversationId)) {
      focusChat(conversationId);
      return;
    }

    if (minimizedChats.has(conversationId)) {
      restoreChat(conversationId);
      return;
    }

    // Enforce max active chats
    if (activeChats.size >= MAX_CHATS) {
      const firstId = activeChats.keys().next().value;
      minimizeChat(firstId);
    }

    const chatBox = createChatBox(conversationId, otherName, otherAvatar);
    container.appendChild(chatBox);
    activeChats.set(conversationId, chatBox);

    if (socket) socket.emit('join-conversation', conversationId);

    await loadMessages(conversationId, chatBox);
    scrollToBottom(chatBox);
    chatBox.querySelector('.chat-box__input').focus();
  };

  // ─── CREATE CHAT BOX ──────────────────────────────────────

  function createChatBox(id, name, avatar) {
    const div = document.createElement('div');
    div.className = 'chat-box';
    div.dataset.id = id;

    div.innerHTML = `
      <div class="chat-box__header">
        <div class="chat-box__header-info">
          <img src="${avatar || '/images/default-avatar.png'}" class="chat-box__avatar" alt="${name}">
          <span class="chat-box__online-dot"></span>
          <span class="chat-box__name">${escapeHtml(name)}</span>
        </div>
        <div class="chat-box__actions">
          <button class="chat-action-btn btn-minimize" title="Minimize">${ICONS.minimize}</button>
          <button class="chat-action-btn btn-expand" title="Open full chat">${ICONS.expand}</button>
          <button class="chat-action-btn btn-close-chat" title="Close">${ICONS.close}</button>
        </div>
      </div>
      <div class="chat-box__body"></div>
      <div class="chat-box__footer">
        <input type="text" class="chat-box__input" placeholder="Type a message..." autocomplete="off">
        <button class="chat-box__send" title="Send">${ICONS.send}</button>
      </div>
    `;

    // Wire event listeners
    const header = div.querySelector('.chat-box__header');
    header.onclick = (e) => {
      if (e.target.closest('.chat-box__actions')) return;
      minimizeChat(id);
    };

    div.querySelector('.btn-minimize').onclick = (e) => { e.stopPropagation(); minimizeChat(id); };
    div.querySelector('.btn-expand').onclick = (e) => { e.stopPropagation(); window.location.href = `/messages/${id}`; };
    div.querySelector('.btn-close-chat').onclick = (e) => { e.stopPropagation(); closeChat(id); };

    const input = div.querySelector('.chat-box__input');
    const sendBtn = div.querySelector('.chat-box__send');

    const doSend = () => {
      const content = input.value.trim();
      if (!content) return;
      performSend(id, content, div);
      input.value = '';
      input.focus();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
    sendBtn.onclick = doSend;

    return div;
  }

  // ─── MINIMIZE / RESTORE / CLOSE ───────────────────────────

  function minimizeChat(id) {
    const chatBox = activeChats.get(id);
    if (!chatBox) return;

    const name = chatBox.querySelector('.chat-box__name').textContent;
    const avatar = chatBox.querySelector('.chat-box__avatar').src;

    chatBox.classList.add('chat-box--closing');
    setTimeout(() => {
      chatBox.remove();
      activeChats.delete(id);
    }, 200);

    // Create minimized icon
    const icon = document.createElement('div');
    icon.className = 'minimized-chat-icon';
    icon.title = name;
    icon.innerHTML = `
      <img src="${avatar}" alt="${escapeHtml(name)}">
      <div class="minimized-chat-close" title="Remove">${ICONS.x}</div>
      <div class="chat-box__badge is-hidden">0</div>
    `;

    icon.onclick = (e) => {
      if (e.target.closest('.minimized-chat-close')) {
        icon.remove();
        minimizedChats.delete(id);
      } else {
        restoreChat(id);
      }
    };

    minimizedContainer.appendChild(icon);
    minimizedChats.set(id, { name, avatar, element: icon, unread: 0 });
  }

  function restoreChat(id) {
    const data = minimizedChats.get(id);
    if (!data) return;
    data.element.remove();
    minimizedChats.delete(id);
    window.openFloatingChat(id, data.name, data.avatar);
  }

  function closeChat(id) {
    const chatBox = activeChats.get(id);
    if (!chatBox) return;
    chatBox.classList.add('chat-box--closing');
    setTimeout(() => {
      chatBox.remove();
      activeChats.delete(id);
    }, 200);
  }

  function focusChat(id) {
    const chatBox = activeChats.get(id);
    if (chatBox) {
      container.appendChild(chatBox);
      chatBox.querySelector('.chat-box__input').focus();
    }
  }

  // ─── LOAD MESSAGES ────────────────────────────────────────

  async function loadMessages(id, chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    body.innerHTML = '<div style="display:flex;justify-content:center;padding:40px 0"><div class="chat-typing"><span class="chat-typing__dot"></span><span class="chat-typing__dot"></span><span class="chat-typing__dot"></span></div></div>';

    try {
      const res = await fetch(`/messages/${id}/api/history`);
      if (!res.ok) throw new Error('Failed');
      const messages = await res.json();

      body.innerHTML = '';
      if (messages.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:30px 10px;color:#b5aead;font-size:13px">No messages yet. Say hi! 👋</div>';
      } else {
        messages.forEach(m => appendMessage(body, m));
      }
      scrollToBottom(chatBox);
    } catch (err) {
      body.innerHTML = '<div style="text-align:center;color:#ef4444;font-size:12px;padding:30px">Could not load messages</div>';
    }
  }

  // ─── APPEND MESSAGE BUBBLE ────────────────────────────────

  function appendMessage(body, m) {
    if (m.id && body.querySelector(`[data-msg-id="${m.id}"]`)) return;

    const bubble = document.createElement('div');
    const isSent = String(m.sender_id) === String(window.CURRENT_USER_ID);
    bubble.className = `chat-bubble chat-bubble--${isSent ? 'sent' : 'received'}`;
    if (m.id) bubble.dataset.msgId = m.id;
    bubble.textContent = m.content;
    body.appendChild(bubble);
  }

  // ─── SEND MESSAGE (Optimistic UI) ─────────────────────────

  async function performSend(id, content, chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    const tempId = 'temp-' + Date.now();

    // Optimistic: show immediately
    appendMessage(body, { id: tempId, sender_id: window.CURRENT_USER_ID, content });
    scrollToBottom(chatBox);

    try {
      const res = await fetch(`/messages/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const saved = await res.json();

      // Swap temp ID with real DB ID
      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl && saved.id) tempEl.dataset.msgId = saved.id;
    } catch (err) {
      // Mark as failed
      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) {
        tempEl.style.opacity = '0.5';
        tempEl.title = 'Failed to send — click to retry';
        tempEl.style.cursor = 'pointer';
        tempEl.onclick = () => {
          tempEl.remove();
          performSend(id, content, chatBox);
        };
      }
    }
  }

  function scrollToBottom(chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  // ─── HTML ESCAPE ──────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ─── INTERCEPT NAVBAR MESSAGE CLICKS ──────────────────────

  document.addEventListener('click', (e) => {
    const msgLink = e.target.closest('#msg-pop-list .topnav__dropdown-item-link');
    if (msgLink) {
      e.preventDefault();
      e.stopPropagation();

      const href = msgLink.getAttribute('href');
      const id = href.split('/').pop();
      const nameEl = msgLink.querySelector('.msg-item__name');
      const avatarEl = msgLink.querySelector('.msg-item__avatar');

      const name = nameEl ? nameEl.textContent : 'User';
      const avatar = avatarEl ? avatarEl.src : '/images/default-avatar.png';

      window.openFloatingChat(id, name, avatar);

      // Close the dropdown
      const wrapper = msgLink.closest('.topnav__icon-wrapper');
      if (wrapper) wrapper.classList.remove('is-active');
    }
  });

  // ─── SOCKET.IO: RECEIVE MESSAGES ──────────────────────────

  if (socket) {
    socket.on('new-message', (data) => {
      const id = data.conversation_id;
      
      // If sender is current user, skip (we already rendered optimistically)
      if (String(data.sender_id) === String(window.CURRENT_USER_ID)) return;

      if (activeChats.has(id)) {
        const chatBox = activeChats.get(id);
        appendMessage(chatBox.querySelector('.chat-box__body'), data);
        scrollToBottom(chatBox);
      } else if (minimizedChats.has(id)) {
        const m = minimizedChats.get(id);
        m.unread++;
        const badge = m.element.querySelector('.chat-box__badge');
        if (badge) {
          badge.textContent = m.unread;
          badge.classList.remove('is-hidden');
        }
      }
    });
  }

})();
