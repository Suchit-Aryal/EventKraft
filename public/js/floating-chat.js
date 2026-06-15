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
    x: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    image: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    paperclip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>'
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

    // Build header via DOM APIs to prevent XSS through avatar/name
    const safeAvatar = avatar || '/images/default-avatar.png';

    div.innerHTML = `
      <div class="chat-box__header">
        <div class="chat-box__header-info">
          <img class="chat-box__avatar">
          <span class="chat-box__online-dot"></span>
          <span class="chat-box__name"></span>
        </div>
        <div class="chat-box__actions">
          <button class="chat-action-btn btn-minimize" title="Minimize">${ICONS.minimize}</button>
          <button class="chat-action-btn btn-expand" title="Open full chat">${ICONS.expand}</button>
          <button class="chat-action-btn btn-close-chat" title="Close">${ICONS.close}</button>
        </div>
      </div>
      <div class="chat-box__body"></div>
      <div class="chat-box__file-bar is-hidden">
        <span class="chat-box__file-bar-name"></span>
        <button type="button" class="chat-box__file-bar-clear" title="Remove">${ICONS.x}</button>
      </div>
      <div class="chat-box__footer">
        <div class="chat-box__attach">
          <button type="button" class="chat-box__attach-btn" title="Attach">${ICONS.plus}</button>
          <div class="chat-box__attach-menu is-hidden">
            <button type="button" class="chat-box__attach-option" data-type="image">${ICONS.image}<span>Photo</span></button>
            <button type="button" class="chat-box__attach-option" data-type="file">${ICONS.paperclip}<span>File</span></button>
          </div>
        </div>
        <input type="text" class="chat-box__input" placeholder="Type a message..." autocomplete="off">
        <button class="chat-box__send" title="Send">${ICONS.send}</button>
      </div>
    `;

    // Set user-controlled values via safe DOM APIs
    const avatarEl = div.querySelector('.chat-box__avatar');
    avatarEl.setAttribute('src', safeAvatar);
    avatarEl.setAttribute('alt', name || 'User');
    div.querySelector('.chat-box__name').textContent = name || 'User';

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

    // Per-chat pending file state
    const pending = { file: null };

    const fileBar = div.querySelector('.chat-box__file-bar');
    const fileBarName = div.querySelector('.chat-box__file-bar-name');
    const fileBarClear = div.querySelector('.chat-box__file-bar-clear');
    const attachBtn = div.querySelector('.chat-box__attach-btn');
    const attachMenu = div.querySelector('.chat-box__attach-menu');

    const showPendingFile = (file) => {
      pending.file = file;
      fileBarName.textContent = file.name;
      fileBar.classList.remove('is-hidden');
    };
    const clearPendingFile = () => {
      pending.file = null;
      fileBarName.textContent = '';
      fileBar.classList.add('is-hidden');
    };
    fileBarClear.onclick = (e) => { e.stopPropagation(); clearPendingFile(); };

    attachBtn.onclick = (e) => {
      e.stopPropagation();
      attachMenu.classList.toggle('is-hidden');
    };
    document.addEventListener('click', (e) => {
      if (!div.isConnected) return;
      if (!attachMenu.contains(e.target) && e.target !== attachBtn) {
        attachMenu.classList.add('is-hidden');
      }
    });

    div.querySelectorAll('.chat-box__attach-option').forEach((opt) => {
      opt.onclick = (e) => {
        e.stopPropagation();
        attachMenu.classList.add('is-hidden');
        const type = opt.dataset.type;
        const picker = document.createElement('input');
        picker.type = 'file';
        if (type === 'image') picker.accept = 'image/*';
        picker.onchange = () => {
          if (picker.files && picker.files[0]) showPendingFile(picker.files[0]);
        };
        picker.click();
      };
    });

    const doSend = () => {
      const content = input.value.trim();
      if (!content && !pending.file) return;
      if (pending.file) {
        performSendFile(id, content, pending.file, div);
        clearPendingFile();
      } else {
        performSend(id, content, div);
      }
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

    // Create minimized icon — set user values via DOM APIs
    const icon = document.createElement('div');
    icon.className = 'minimized-chat-icon';
    icon.title = name;
    icon.innerHTML = `
      <img>
      <div class="minimized-chat-close" title="Remove">${ICONS.x}</div>
      <div class="chat-box__badge is-hidden">0</div>
    `;
    const iconImg = icon.querySelector('img');
    iconImg.setAttribute('src', avatar);
    iconImg.setAttribute('alt', name || 'User');

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
        body.innerHTML = '<div style="text-align:center;padding:30px 10px;color:#b5aead;font-size:13px">No messages yet. Start the conversation.</div>';
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

    if (m.message_type === 'booking_request') {
      appendBookingCard(body, normalizeBookingMessage(m));
      return;
    }

    const bubble = document.createElement('div');
    const isSent = String(m.sender_id) === String(window.CURRENT_USER_ID);
    bubble.className = `chat-bubble chat-bubble--${isSent ? 'sent' : 'received'}`;
    if (m.id) bubble.dataset.msgId = m.id;

    let hasAttachment = false;
    if (m.file_url) {
      hasAttachment = true;
      if (m.file_type && m.file_type.startsWith('image/')) {
        const link = document.createElement('a');
        link.href = m.file_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const img = document.createElement('img');
        img.src = m.file_url;
        img.alt = m.file_name || 'Image';
        img.className = 'chat-bubble__image';
        link.appendChild(img);
        bubble.appendChild(link);
      } else {
        const link = document.createElement('a');
        link.href = m.file_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'chat-bubble__file';
        link.innerHTML = `${ICONS.paperclip}<span></span>`;
        link.querySelector('span').textContent = m.file_name || 'File';
        bubble.appendChild(link);
      }
    } else if (m.file_name && m.pending) {
      hasAttachment = true;
      const ph = document.createElement('div');
      ph.className = 'chat-bubble__file';
      ph.innerHTML = `${ICONS.paperclip}<span></span>`;
      ph.querySelector('span').textContent = `${m.file_name} (uploading…)`;
      bubble.appendChild(ph);
    }

    if (m.content) {
      const text = document.createElement('div');
      text.className = 'js-msg-text';
      text.textContent = m.content;
      if (hasAttachment) text.style.marginTop = '6px';
      bubble.appendChild(text);
    }

    body.appendChild(bubble);
  }

  function normalizeBookingMessage(m) {
    let payload = {};
    if (m.content) {
      try { payload = JSON.parse(m.content); } catch (e) {}
    }

    return {
      id: m.id,
      booking_id: m.booking_id || payload.booking_id,
      booking_status: m.booking_status || payload.booking_status || 'pending',
      receiver_id: m.receiver_id || payload.receiver_id,
      worker_id: m.worker_id || payload.worker_id,
      can_decide: m.can_decide,
      gig_title: m.gig_title || payload.gig_title || 'Service Booking',
      package_name: m.package_name || payload.package_name || 'Package',
      event_date: m.event_date || payload.event_date,
      event_location: m.event_location || payload.event_location || payload.event_venue,
      total_amount: m.total_amount || payload.total_amount || payload.total_price,
      customer_note: m.customer_note || payload.customer_note,
    };
  }

  function appendBookingCard(body, data) {
    if (!data.booking_id) return;
    if (body.querySelector(`[data-booking-id="${data.booking_id}"]`)) return;

    const status = data.booking_status || 'pending';
    const canDecide = status === 'pending' &&
      String(data.receiver_id || data.worker_id || '') === String(window.CURRENT_USER_ID || '');
    const eventDate = data.event_date ? new Date(data.event_date).toLocaleDateString('en-NP') : 'Not specified';
    const totalPrice = data.total_amount ? Number(data.total_amount).toLocaleString('en-NP') : '0';

    const card = document.createElement('div');
    card.className = 'floating-booking-card';
    card.dataset.bookingId = data.booking_id;
    if (data.id) card.dataset.msgId = data.id;
    card.innerHTML = `
      <button type="button" class="floating-booking-card__head">
        <span>
          <strong>Booking Request</strong>
          <small>${escapeHtml(data.gig_title || '')}</small>
        </span>
        <span class="floating-booking-card__chevron">▾</span>
      </button>
      <div class="floating-booking-card__body">
        <div><span>Package</span><strong>${escapeHtml(data.package_name || 'N/A')}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(eventDate)}</strong></div>
        <div><span>Venue</span><strong>${escapeHtml(data.event_location || 'Not specified')}</strong></div>
        <div><span>Total</span><strong>NPR ${escapeHtml(totalPrice)}</strong></div>
        ${data.customer_note ? `<p>${escapeHtml(data.customer_note)}</p>` : ''}
        ${canDecide
          ? `<div class="floating-booking-card__actions">
               <button type="button" class="floating-booking-card__accept" onclick="respondToBooking('${data.booking_id}', 'accepted')">Accept</button>
               <button type="button" class="floating-booking-card__decline" onclick="respondToBooking('${data.booking_id}', 'declined')">Decline</button>
             </div>`
          : status === 'pending'
            ? `<div class="floating-booking-card__progress">Waiting for worker response</div>`
            : `<div class="floating-booking-card__decision floating-booking-card__decision--${status === 'cancelled' ? 'declined' : 'accepted'}">${status === 'cancelled' ? 'Declined' : 'Accepted'}</div>`
        }
      </div>
    `;

    const head = card.querySelector('.floating-booking-card__head');
    const bodyEl = card.querySelector('.floating-booking-card__body');
    const chevron = card.querySelector('.floating-booking-card__chevron');
    head.addEventListener('click', () => {
      const open = bodyEl.classList.toggle('is-open');
      chevron.textContent = open ? '▴' : '▾';
    });

    body.appendChild(card);
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
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      // Swap temp ID with real DB ID
      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl && data.id) {
        tempEl.dataset.msgId = data.id;
        // Reconcile with the server-filtered content (profanity masked)
        if (typeof data.content === 'string') {
          const textEl = tempEl.querySelector('.js-msg-text');
          if (textEl) textEl.textContent = data.content;
        }
      }
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

  async function performSendFile(id, content, file, chatBox) {
    const body = chatBox.querySelector('.chat-box__body');
    const tempId = 'temp-' + Date.now();

    appendMessage(body, {
      id: tempId,
      sender_id: window.CURRENT_USER_ID,
      content,
      file_name: file.name,
      file_type: file.type,
      pending: true
    });
    scrollToBottom(chatBox);

    try {
      const formData = new FormData();
      formData.append('chatFile', file);
      formData.append('content', content || '');

      const res = await fetch(`/messages/${id}/send-file`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) tempEl.remove();
      appendMessage(body, {
        id: data.id,
        sender_id: window.CURRENT_USER_ID,
        content,
        file_url: data.file_url,
        file_name: data.file_name,
        file_type: data.file_type
      });
      scrollToBottom(chatBox);
    } catch (err) {
      const tempEl = body.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) {
        tempEl.style.opacity = '0.5';
        tempEl.title = 'Failed to upload — ' + err.message;
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

  function updateBookingCards(bookingId, status, decision) {
    const finalDecision = decision || (status === 'cancelled' ? 'declined' : 'accepted');
    document.querySelectorAll(`[data-booking-id="${bookingId}"]`).forEach((card) => {
      const label = finalDecision === 'accepted' ? 'Accepted' : 'Declined';
      const icon = finalDecision === 'accepted' ? 'bi-check-circle' : 'bi-x-circle';
      const floatingHtml = `<div class="floating-booking-card__decision floating-booking-card__decision--${finalDecision}">${label}</div>`;
      const chatHtml = `<div class="booking-decision booking-decision--${finalDecision}"><i class="bi ${icon} me-1"></i>${label}</div>`;

      const floatingTarget = card.querySelector('.floating-booking-card__actions, .floating-booking-card__progress, .floating-booking-card__decision');
      const chatTarget = card.querySelector('.booking-actions, .booking-progress, .booking-decision');
      if (floatingTarget) floatingTarget.outerHTML = floatingHtml;
      if (chatTarget) chatTarget.outerHTML = chatHtml;
    });
  }

  window.respondToBooking = async function(bookingId, decision) {
    const cards = document.querySelectorAll(`[data-booking-id="${bookingId}"]`);
    cards.forEach((card) => {
      card.querySelectorAll('.floating-booking-card__actions button, .booking-actions button').forEach((btn) => {
        btn.disabled = true;
        btn.textContent = 'Saving...';
      });
    });

    try {
      const res = await fetch(`/bookings/${bookingId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update booking');
      updateBookingCards(bookingId, data.status, data.decision || decision);
    } catch (err) {
      alert(err.message);
      cards.forEach((card) => {
        const floatingActions = card.querySelector('.floating-booking-card__actions');
        if (floatingActions) {
          floatingActions.innerHTML = `
            <button type="button" class="floating-booking-card__accept" onclick="respondToBooking('${bookingId}', 'accepted')">Accept</button>
            <button type="button" class="floating-booking-card__decline" onclick="respondToBooking('${bookingId}', 'declined')">Decline</button>
          `;
        }

        const chatActions = card.querySelector('.booking-actions');
        if (chatActions) {
          chatActions.innerHTML = `
            <button class="btn btn-success btn-sm" onclick="respondToBooking('${bookingId}', 'accepted')">Accept</button>
            <button class="btn btn-danger btn-sm" onclick="respondToBooking('${bookingId}', 'declined')">Decline</button>
          `;
        }
      });
    }
  };

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
    socket.on('booking_request_card', async (data) => {
      if (!data || !data.conversation_id) return;
      const convoId = String(data.conversation_id);
      if (window.location.pathname === `/messages/${convoId}`) return;

      await window.openFloatingChat(
        convoId,
        data.customer_name || 'Customer',
        data.customer_avatar || '/images/default-avatar.png'
      );

      const chatBox = activeChats.get(convoId);
      if (chatBox) {
        appendBookingCard(chatBox.querySelector('.chat-box__body'), data);
        scrollToBottom(chatBox);
      }
    });

    socket.on('booking_card_decided', (data) => {
      updateBookingCards(data.booking_id, data.status, data.decision);
    });

    socket.on('new-message', (data) => {
      const id = data.conversation_id;

      // If sender is current user, skip (we already rendered optimistically)
      if (String(data.sender_id) === String(window.CURRENT_USER_ID)) return;

      if (activeChats.has(id)) {
        const chatBox = activeChats.get(id);
        // Deduplicate — skip if already rendered
        if (data.id && chatBox.querySelector(`[data-msg-id="${data.id}"]`)) return;
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
