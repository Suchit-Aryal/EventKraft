// ============================================================
// Chat.js — Real-time messaging with reply, unsend, file upload
// ============================================================

(function () {
    const container = document.getElementById('chat-container');
    if (!container) return;

    if (typeof io === 'undefined') return;
    const socket = window.socket || io();
    if (!window.socket) window.socket = socket;

    const conversationId = container.dataset.conversationId;
    const currentUserId = container.dataset.userId;
    const currentUserName = container.dataset.userName || 'You';
    const receiverId = container.dataset.receiverId;
    const messageArea = document.getElementById('messageArea');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    // State
    let replyToId = null;
    let pendingFile = null;
    let sending = false;
    const FETCH_TIMEOUT = 30000; // 30s
    const pendingMessages = {}; // tempId → { timer }

    // Join room
    socket.emit('join-conversation', conversationId);

    // ── THEME TOGGLE ────────────────────────────────
    var themeBtn = document.getElementById('themeToggle');
    var themeIcon = document.getElementById('themeIcon');
    var savedTheme = localStorage.getItem('chatTheme') || 'light';
    applyTheme(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var next = container.classList.contains('chat-dark') ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('chatTheme', next);
        });
    }

    function applyTheme(t) {
        container.classList.remove('chat-light', 'chat-dark');
        container.classList.add('chat-' + t);
        if (themeIcon) themeIcon.className = t === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }

    // ── REPLY ───────────────────────────────────────
    window.setReply = function (msgId, senderName, preview) {
        replyToId = msgId;
        document.getElementById('replyPreview').innerHTML = '<strong>' + escapeHtml(senderName) + ':</strong> ' + escapeHtml(preview);
        document.getElementById('replyBar').classList.remove('d-none');
        messageInput.focus();
    };

    window.clearReply = function () {
        replyToId = null;
        document.getElementById('replyBar').classList.add('d-none');
    };

    // ── FILE ATTACH ─────────────────────────────────
    var fileInput = document.getElementById('chatFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                pendingFile = this.files[0];
                document.getElementById('fileBarName').textContent = pendingFile.name;
                document.getElementById('fileBar').classList.remove('d-none');
            }
        });
    }

    window.pickImage = function () {
        var tmp = document.createElement('input');
        tmp.type = 'file';
        tmp.accept = 'image/*';
        tmp.onchange = function () {
            if (tmp.files.length > 0) {
                pendingFile = tmp.files[0];
                document.getElementById('fileBarName').textContent = pendingFile.name;
                document.getElementById('fileBar').classList.remove('d-none');
            }
        };
        tmp.click();
    };

    window.clearFile = function () {
        pendingFile = null;
        if (fileInput) fileInput.value = '';
        document.getElementById('fileBar').classList.add('d-none');
    };

    // ── SENDING ─────────────────────────────────────
    if (messageForm) {
        messageForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (sending) return;
            var content = messageInput.value.trim();
            if (!content && !pendingFile) return;

            sending = true;

            var tempId = 'temp_' + Date.now();

            // Optimistic render
            appendMessage({
                id: tempId,
                content: content,
                sender_id: currentUserId,
                created_at: new Date().toISOString(),
                pending: true,
                reply_to: replyToId,
                file_name: pendingFile ? pendingFile.name : null,
                file_type: pendingFile ? pendingFile.type : null
            });
            messageInput.value = '';
            scrollToBottom();

            var savedReplyTo = replyToId;
            clearReply();

            var abortController = new AbortController();
            var timeoutTimer = setTimeout(function () {
                abortController.abort();
            }, FETCH_TIMEOUT);

            try {
                var saved;

                if (pendingFile) {
                    // Upload file — AbortSignal not supported with FormData on all browsers, skip timeout for file sends
                    clearTimeout(timeoutTimer);
                    var formData = new FormData();
                    formData.append('chatFile', pendingFile);
                    formData.append('receiver_id', receiverId);
                    formData.append('content', content);
                    if (savedReplyTo) formData.append('reply_to', savedReplyTo);

                    var res = await fetch('/messages/' + conversationId + '/send-file', {
                        method: 'POST',
                        body: formData
                    });
                    if (!res.ok) {
                        var errData = await res.json().catch(function() { return {}; });
                        throw new Error(errData.error || 'Upload failed');
                    }
                    saved = await res.json();
                    clearFile();
                } else {
                    var res = await fetch('/messages/' + conversationId + '/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: content,
                            receiver_id: receiverId,
                            reply_to: savedReplyTo
                        }),
                        signal: abortController.signal
                    });
                    clearTimeout(timeoutTimer);
                    if (!res.ok) throw new Error('Server returned ' + res.status);
                    saved = await res.json();
                }

                if (!saved || !saved.id) throw new Error('Invalid response from server');

                // Confirm
                var tempEl = document.getElementById('msg-' + tempId);
                if (tempEl) {
                    tempEl.id = 'msg-' + saved.id;
                    tempEl.classList.remove('msg-pending');
                    tempEl.dataset.msgId = saved.id;
                    // Update file preview if uploaded
                    if (saved.file_url) {
                        var bubble = tempEl.querySelector('.chat-sent,.chat-received');
                        if (bubble) {
                            // Remove the optimistic "uploading…" preview
                            var oldPreview = bubble.querySelector('.msg-file-preview');
                            if (oldPreview) oldPreview.remove();
                            var fileHtml = buildFileHtml(saved.file_url, saved.file_name, saved.file_type);
                            bubble.insertAdjacentHTML('afterbegin', fileHtml);
                        }
                    }
                }
            } catch (err) {
                console.error('Send failed:', err);
                var tempEl = document.getElementById('msg-' + tempId);
                if (tempEl) {
                    tempEl.classList.remove('msg-pending');
                    var timeEl = tempEl.querySelector('.msg-time');
                    if (timeEl) timeEl.textContent = err.name === 'AbortError' ? 'Timed out' : 'Failed to send';
                }
            } finally {
                sending = false;
                clearTimeout(timeoutTimer);
            }
        });
    }

    // ── UNSEND ──────────────────────────────────────
    window.unsendMsg = async function (msgId) {
        if (!confirm('Unsend this message?')) return;
        try {
            await fetch('/messages/' + msgId + '/unsend', { method: 'POST' });
            var el = document.getElementById('msg-' + msgId);
            if (el) {
                el.classList.add('msg-unsent');
                var bubble = el.querySelector('.chat-sent,.chat-received');
                if (bubble) {
                    // Remove file previews and actions
                    var actions = el.querySelector('.msg-actions');
                    if (actions) actions.remove();
                    bubble.innerHTML = '<p class="mb-0" style="font-size:.85rem;font-style:italic;opacity:.5"><i class="bi bi-x-circle me-1"></i>This message was unsent</p>';
                }
            }
            // Notify other user
            socket.emit('message-unsent', { conversationId: conversationId, messageId: msgId });
        } catch (err) {
            console.error('Unsend failed:', err);
        }
    };

    // ── RECEIVING ────────────────────────────────────
    socket.on('new-message', function (msg) {
        if (msg.sender_id === currentUserId) return;
        if (msg.conversation_id !== conversationId) return;
        if (document.getElementById('msg-' + msg.id)) return;
        appendMessage(msg);
        scrollToBottom();
    });

    socket.on('message-unsent', function (data) {
        var el = document.getElementById('msg-' + data.messageId);
        if (el) {
            el.classList.add('msg-unsent');
            var bubble = el.querySelector('.chat-sent,.chat-received');
            if (bubble) {
                var actions = el.querySelector('.msg-actions');
                if (actions) actions.remove();
                bubble.innerHTML = '<p class="mb-0" style="font-size:.85rem;font-style:italic;opacity:.5"><i class="bi bi-x-circle me-1"></i>This message was unsent</p>';
            }
        }
    });

    // ── HELPERS ──────────────────────────────────────
    function appendMessage(msg) {
        // Remove empty chat placeholder
        var empty = document.getElementById('emptyChat');
        if (empty) empty.remove();

        var isOwn = msg.sender_id === currentUserId;
        var div = document.createElement('div');
        div.id = 'msg-' + msg.id;
        div.className = 'd-flex mb-3 msg-wrap ' + (isOwn ? 'justify-content-end' : 'justify-content-start') + (msg.pending ? ' msg-pending' : '');
        div.style.position = 'relative';
        div.dataset.msgId = msg.id;
        div.dataset.sender = msg.sender_id;
        div.dataset.content = msg.content || '';

        if (msg.message_type === 'booking_request') {
            div.className = 'mb-3 msg-wrap booking-card-message';
            div.dataset.bookingId = msg.booking_id || '';
            div.innerHTML = bookingCardInnerHtml(msg);
            messageArea.appendChild(div);
            return;
        }

        var bubbleClass = isOwn ? 'chat-sent' : 'chat-received';
        var html = '<div class="' + bubbleClass + '" style="max-width:70%;padding:.6rem 1rem;border-radius:16px;position:relative">';

        // Reply preview
        if (msg.reply_to) {
            var replyEl = document.querySelector('[data-msg-id="' + msg.reply_to + '"]');
            var replyText = replyEl ? (replyEl.dataset.content || '').substring(0, 50) : '...';
            html += '<div class="msg-reply-preview">' + escapeHtml(replyText) + '</div>';
        }

        // File
        if (msg.file_url) {
            html += buildFileHtml(msg.file_url, msg.file_name, msg.file_type);
        } else if (msg.file_name && msg.pending) {
            html += '<div class="msg-file-preview"><i class="bi bi-paperclip"></i><span style="font-size:.8rem">' + escapeHtml(msg.file_name) + ' (uploading…)</span></div>';
        }

        // Content
        if (msg.content) {
            html += '<p class="mb-0" style="font-size:.9rem">' + escapeHtml(msg.content) + '</p>';
        }
        html += '<small class="msg-time" style="opacity:.5;font-size:.7rem">' + formatTime(msg.created_at) + '</small>';
        html += '</div>';

        // Actions
        if (!msg.pending) {
            html += '<div class="msg-actions">';
            html += '<button class="msg-action-btn" title="Reply" onclick="setReply(\'' + msg.id + '\',\'' + escapeHtml(msg.sender_name || (isOwn ? 'You' : 'User')) + '\',\'' + escapeHtml((msg.content || '').substring(0, 50)) + '\')"><i class="bi bi-reply-fill"></i></button>';
            if (isOwn) {
                html += '<button class="msg-action-btn" title="Unsend" onclick="unsendMsg(\'' + msg.id + '\')"><i class="bi bi-x-circle"></i></button>';
            }
            html += '</div>';
        }

        div.innerHTML = html;
        messageArea.appendChild(div);
    }

    function buildFileHtml(url, name, type) {
        if (type && type.startsWith('image/')) {
            return '<div class="msg-image-wrap"><a href="' + url + '" target="_blank" rel="noopener noreferrer"><img src="' + url + '" alt="' + escapeHtml(name || 'Image') + '" style="max-width:100%;border-radius:8px;max-height:200px"></a><a href="' + url + '" download class="msg-download-btn"><i class="bi bi-download"></i></a></div>';
        }
        var icon = 'bi-file-earmark';
        if (type === 'application/pdf') icon = 'bi-file-earmark-pdf-fill';
        else if (type && (type.includes('zip') || type.includes('rar'))) icon = 'bi-file-earmark-zip-fill';
        return '<div class="msg-file-wrap"><a href="' + url + '" target="_blank" rel="noopener noreferrer" class="msg-file-preview"><i class="bi ' + icon + '"></i><span style="font-size:.8rem">' + escapeHtml(name || 'File') + '</span></a><a href="' + url + '" download class="msg-download-btn"><i class="bi bi-download"></i></a></div>';
    }

    function bookingCardInnerHtml(data) {
        var eventDate = data.event_date ? new Date(data.event_date).toLocaleDateString('en-NP') : 'Not specified';
        var totalPrice = data.total_amount ? Number(data.total_amount).toLocaleString('en-NP') : '0';
        var bookingStatus = data.booking_status || 'pending';
        var isPending = bookingStatus === 'pending';
        var isDeclined = bookingStatus === 'cancelled';
        var canDecide = isPending && String(data.receiver_id || data.worker_id || '') === String(currentUserId);

        return `
            <div class="booking-card">
                <button type="button" class="booking-card-header" aria-expanded="false" onclick="toggleBookingCard(this)">
                    <div class="booking-card-title">
                        <span class="booking-icon"><i class="bi bi-calendar-check"></i></span>
                        <strong>Booking Request</strong>
                        <span class="booking-gig-name">${escapeHtml(data.gig_title || '')}</span>
                    </div>
                    <span class="booking-card-chevron">▾</span>
                </button>
                <div class="booking-card-body" style="display:none;">
                    <div class="booking-detail-row"><span>Package</span><strong>${escapeHtml(data.package_name || 'N/A')}</strong></div>
                    <div class="booking-detail-row"><span>Event Date</span><strong>${escapeHtml(eventDate)}</strong></div>
                    <div class="booking-detail-row"><span>Venue</span><strong>${escapeHtml(data.event_location || 'Not specified')}</strong></div>
                    <div class="booking-detail-row"><span>Total Price</span><strong>NPR ${escapeHtml(totalPrice)}</strong></div>
                    ${data.customer_note ? `<div class="booking-note"><em>"${escapeHtml(data.customer_note)}"</em></div>` : ''}
                    ${canDecide
                        ? `<div class="booking-actions">
                               <button class="btn btn-success btn-sm" onclick="respondToBooking('${data.booking_id}', 'accepted')">Accept</button>
                               <button class="btn btn-danger btn-sm" onclick="respondToBooking('${data.booking_id}', 'declined')">Decline</button>
                           </div>`
                        : isPending
                            ? `<div class="booking-progress"><i class="bi bi-clock-history me-1"></i>Waiting for worker response</div>`
                            : `<div class="booking-decision booking-decision--${isDeclined ? 'declined' : 'accepted'}"><i class="bi ${isDeclined ? 'bi-x-circle' : 'bi-check-circle'} me-1"></i>${isDeclined ? 'Declined' : 'Accepted'}</div>`
                    }
                </div>
            </div>
        `;
    }

    function scrollToBottom() {
        if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function formatTime(iso) {
        try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
        catch (e) { return ''; }
    }

    scrollToBottom();
})();

// ============================================================
// Booking Card — Real-time booking request cards in chat
// ============================================================

(function () {
    if (typeof io === 'undefined') return;
    const socket = window.socket || io();
    if (!window.socket) window.socket = socket;

    socket.on('booking_request_card', (data) => {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const convId = String(container.dataset.conversationId || '');
        if (convId && convId !== String(data.conversation_id || '')) return;
        if (data.content && typeof data.content === 'string') {
            try {
                const parsed = JSON.parse(data.content);
                Object.assign(data, parsed);
            } catch (e) {}
        }
        renderBookingCard(data, false, null);
        const messageArea = document.getElementById('messageArea');
        if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;
    });

    socket.on('booking_status_update', (data) => {
        if (data.redirect) {
            if (confirm(data.message + '\n\nClick OK to proceed.')) {
                window.location.href = data.redirect;
            }
        }
    });

    socket.on('booking_card_decided', (data) => {
        updateBookingCards(data.booking_id, data.status, data.decision);
    });
})();

function renderBookingCard(data, decided, decision) {
    const messageArea = document.getElementById('messageArea');
    if (!messageArea) return;
    if (data.booking_id && messageArea.querySelector(`[data-booking-id="${data.booking_id}"]`)) return;

    const card = document.createElement('div');
    card.className = 'booking-card-message';
    card.setAttribute('data-booking-id', data.booking_id);

    const eventDate = data.event_date
        ? new Date(data.event_date).toLocaleDateString('en-NP')
        : 'Not specified';
    const totalPrice = data.total_price || data.total_amount
        ? Number(data.total_price || data.total_amount).toLocaleString('en-NP')
        : '0';
    const status = data.booking_status || (decided ? (decision === 'declined' ? 'cancelled' : 'accepted') : 'pending');
    const canDecide = status === 'pending' &&
        String(data.receiver_id || data.worker_id || '') === String(window.CURRENT_USER_ID || '');

    card.innerHTML = `
        <div class="booking-card">
            <button type="button" class="booking-card-header" aria-expanded="false" onclick="toggleBookingCard(this)">
                <div class="booking-card-title">
                    <span class="booking-icon"><i class="bi bi-calendar-check"></i></span>
                    <strong>Booking Request</strong>
                    <span class="booking-gig-name">${escapeBookingHtml(data.gig_title || '')}</span>
                </div>
                <span class="booking-card-chevron">▾</span>
            </button>
            <div class="booking-card-body" style="display:none;">
                <div class="booking-detail-row"><span>Package</span><strong>${escapeBookingHtml(data.package_name || 'N/A')}</strong></div>
                <div class="booking-detail-row"><span>Event Date</span><strong>${escapeBookingHtml(eventDate)}</strong></div>
                <div class="booking-detail-row"><span>Venue</span><strong>${escapeBookingHtml(data.event_venue || data.event_location || 'Not specified')}</strong></div>
                <div class="booking-detail-row"><span>Total Price</span><strong>NPR ${escapeBookingHtml(totalPrice)}</strong></div>
                ${data.customer_note ? `<div class="booking-note"><em>"${escapeBookingHtml(data.customer_note)}"</em></div>` : ''}
                ${canDecide
                    ? `<div class="booking-actions">
                           <button class="btn btn-success btn-sm" onclick="respondToBooking('${data.booking_id}', 'accepted')">Accept</button>
                           <button class="btn btn-danger btn-sm" onclick="respondToBooking('${data.booking_id}', 'declined')">Decline</button>
                       </div>`
                    : status === 'pending'
                        ? `<div class="booking-progress"><i class="bi bi-clock-history me-1"></i>Waiting for worker response</div>`
                        : `<div class="booking-decision booking-decision--${status === 'cancelled' ? 'declined' : 'accepted'}"><i class="bi ${status === 'cancelled' ? 'bi-x-circle' : 'bi-check-circle'} me-1"></i>${status === 'cancelled' ? 'Declined' : 'Accepted'}</div>`
                }
            </div>
        </div>
    `;

    messageArea.appendChild(card);
}

function toggleBookingCard(headerEl) {
    const body = headerEl.nextElementSibling;
    const chevron = headerEl.querySelector('.booking-card-chevron');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    headerEl.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    chevron.textContent = isOpen ? '▾' : '▴';
}

async function respondToBooking(bookingId, decision) {
    const cards = document.querySelectorAll(`[data-booking-id="${bookingId}"]`);
    cards.forEach((card) => {
        card.querySelectorAll('.booking-actions button').forEach((btn) => {
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
            const actions = card.querySelector('.booking-actions');
            if (actions) {
                actions.innerHTML = `
                    <button class="btn btn-success btn-sm" onclick="respondToBooking('${bookingId}', 'accepted')">Accept</button>
                    <button class="btn btn-danger btn-sm" onclick="respondToBooking('${bookingId}', 'declined')">Decline</button>
                `;
            }
        });
    }
}

function updateBookingCards(bookingId, status, decision) {
    if (!bookingId) return;
    const finalDecision = decision || (status === 'cancelled' ? 'declined' : 'accepted');
    document.querySelectorAll(`[data-booking-id="${bookingId}"]`).forEach((card) => {
        const actions = card.querySelector('.booking-actions');
        const progress = card.querySelector('.booking-progress');
        const existingDecision = card.querySelector('.booking-decision');
        const decisionHtml = `<div class="booking-decision booking-decision--${finalDecision}"><i class="bi ${finalDecision === 'accepted' ? 'bi-check-circle' : 'bi-x-circle'} me-1"></i>${finalDecision === 'accepted' ? 'Accepted' : 'Declined'}</div>`;
        if (actions) actions.outerHTML = decisionHtml;
        else if (progress) progress.outerHTML = decisionHtml;
        else if (existingDecision) existingDecision.outerHTML = decisionHtml;
    });
}

function escapeBookingHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
