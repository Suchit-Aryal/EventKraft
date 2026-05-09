/**
 * Facebook-style Floating Chat System
 */
(function() {
  const container = document.createElement('div');
  container.className = 'floating-chat-container';
  document.body.appendChild(container);

  const minimizedContainer = document.createElement('div');
  minimizedContainer.className = 'minimized-chats';
  document.body.appendChild(minimizedContainer);

  const activeChats = new Map(); // conversationId -> DOM Element
  const minimizedChats = new Map(); // conversationId -> Data
  
  let socket = null;
  try {
    if (typeof io !== 'undefined') {
      socket = window.socket || io();
      if (!window.socket) window.socket = socket;
    }
  } catch(e) {}

  // ─── CORE FUNCTIONS ────────────────────────────────────────

  window.openFloatingChat = async function(conversationId, otherName, otherAvatar) {
    if (activeChats.has(conversationId)) {
      focusChat(conversationId);
      return;
    }
    
    if (minimizedChats.has(conversationId)) {
      restoreChat(conversationId);
      return;
    }

    // Limit to 3 active chats
    if (activeChats.size >= 3) {
      const firstId = activeChats.keys().next().value;
      minimizeChat(firstId);
    }

    const chatBox = createChatBox(conversationId, otherName, otherAvatar);
    container.appendChild(chatBox);
    activeChats.set(conversationId, chatBox);
    
    if (socket) socket.emit('join-conversation', conversationId);
    
    await loadMessages(conversationId, chatBox);
    scrollToBottom(chatBox);
  };

  function createChatBox(id, name, avatar) {
    const div = document.createElement('div');
    div.className = 'chat-box';
    div.dataset.id = id;
    
    div.innerHTML = `
      <div class="chat-box__header">
        <div class="chat-box__header-info">
          <img src="${avatar || '/images/default-avatar.png'}" class="chat-box__avatar">
          <span class="chat-box__name">${name}</span>
        </div>
        <div class="chat-box__actions">
          <button class="chat-action-btn btn-minimize"><i class="bi bi-dash-lg"></i></button>
          <button class="chat-action-btn btn-expand"><i class="bi bi-arrows-angle-expand"></i></button>
          <button class="chat-action-btn btn-close"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div class="chat-box__body"></div>
      <div class="chat-box__footer">
        <input type="text" class="chat-box__input" placeholder="Type a message...">
        <button class="chat-box__send"><i class="bi bi-send-fill"></i></button>
      </div>
    `;

    // Event Listeners
    div.querySelector('.chat-box__header').onclick = (e) => {
      if (e.target.closest('.chat-box__actions')) return;
      minimizeChat(id);
    };
    div.querySelector('.btn-minimize').onclick = () => minimizeChat(id);
    div.querySelector('.btn-expand').onclick = () => window.location.href = `/messages/${id}`;
    div.querySelector('.btn-close').onclick = () => closeChat(id);
    
    const input = div.querySelector('.chat-box__input');
    const sendBtn = div.querySelector('.chat-box__send');
    
    const sendMessage = () => {
      const content = input.value.trim();
      if (content) {
        performSend(id, content, div);
        input.value = '';
      }
    };

    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    sendBtn.onclick = sendMessage;

    return div;
  }

  function minimizeChat(id) {
    const chatBox = activeChats.get(id);
    if (!chatBox) return;

    const name = chatBox.querySelector('.chat-box__name').textContent;
    const avatar = chatBox.querySelector('.chat-box__avatar').src;

    chatBox.remove();
    activeChats.delete(id);
    
    const icon = document.createElement('div');
    icon.className = 'minimized-chat-icon';
    icon.innerHTML = `
      <img src="${avatar}">
      <div class="minimized-chat-close"><i class="bi bi-x"></i></div>
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
    if (chatBox) {
      chatBox.remove();
      activeChats.delete(id);
    }
  }

  function focusChat(id) {
    const chatBox = activeChats.get(id);
    if (chatBox) {
      container.appendChild(chatBox); // move to end of flex
      chatBox.querySelector('.chat-box__input').focus();
    }
  }

  async function loadMessages(id, chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    body.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-muted"></div></div>';
    
    try {
      const res = await fetch(`/messages/${id}/api/history`);
      const messages = await res.json();
      
      body.innerHTML = '';
      messages.forEach(m => appendMessage(body, m));
      scrollToBottom(chatBox);
    } catch (err) {
      body.innerHTML = '<div class="text-center text-muted small py-4">Could not load history</div>';
    }
  }

  function appendMessage(body, m) {
    // Avoid duplicates from Socket.io if we already rendered optimistically
    if (m.id && body.querySelector(`[data-msg-id="${m.id}"]`)) return;
    
    const bubble = document.createElement('div');
    const isSent = m.sender_id == window.CURRENT_USER_ID;
    bubble.className = `chat-bubble chat-bubble--${isSent ? 'sent' : 'received'}`;
    if (m.id) bubble.dataset.msgId = m.id;
    bubble.textContent = m.content;
    body.appendChild(bubble);
  }

  async function performSend(id, content, chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    const tempId = 'temp-' + Date.now();
    
    // Optimistic UI
    appendMessage(body, { id: tempId, sender_id: window.CURRENT_USER_ID, content });
    scrollToBottom(chatBox);

    try {
      const res = await fetch(`/messages/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const saved = await res.json();
      
      // Update the temp message with real ID
      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) tempEl.dataset.msgId = saved.id;
      
    } catch (err) {
      console.error('Send error:', err);
    }
  }

  function scrollToBottom(chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    body.scrollTop = body.scrollHeight;
  }

  // ─── INTERCEPT NAVBAR CLICKS ───────────────────────────────

  document.addEventListener('click', (e) => {
    const msgLink = e.target.closest('#msg-pop-list .topnav__dropdown-item-link');
    if (msgLink) {
      e.preventDefault();
      const href = msgLink.getAttribute('href');
      const id = href.split('/').pop();
      const name = msgLink.querySelector('.msg-item__name').textContent;
      const avatar = msgLink.querySelector('.msg-item__avatar').src;
      
      window.openFloatingChat(id, name, avatar);
      
      // Close the dropdown
      const dropdown = msgLink.closest('.topnav__dropdown');
      if (dropdown) dropdown.style.display = 'none';
      setTimeout(() => dropdown.style.display = '', 200);
    }
  });

  // ─── SOCKET.IO INTEGRATION ──────────────────────────────────

  if (socket) {
    socket.on('new-message', (data) => {
      const id = data.conversation_id;
      if (activeChats.has(id)) {
        appendMessage(activeChats.get(id).querySelector('.chat-box__body'), data);
        scrollToBottom(activeChats.get(id));
      } else if (minimizedChats.has(id)) {
        const m = minimizedChats.get(id);
        m.unread++;
        const badge = m.element.querySelector('.chat-box__badge');
        badge.textContent = m.unread;
        badge.classList.remove('is-hidden');
      }
    });
  }

})();
