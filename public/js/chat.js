// ============================================================
// Chat.js — Real-time messaging with reply, unsend, file upload
// ============================================================

(function () {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const socket = io();
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
            var content = messageInput.value.trim();
            if (!content && !pendingFile) return;

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

            try {
                var saved;

                if (pendingFile) {
                    // Upload file
                    var formData = new FormData();
                    formData.append('chatFile', pendingFile);
                    formData.append('receiver_id', receiverId);
                    formData.append('content', content);
                    if (savedReplyTo) formData.append('reply_to', savedReplyTo);

                    var res = await fetch('/messages/' + conversationId + '/send-file', {
                        method: 'POST',
                        body: formData
                    });
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
                        })
                    });
                    saved = await res.json();
                }

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
                            var fileHtml = buildFileHtml(saved.file_url, saved.file_name, saved.file_type);
                            bubble.insertAdjacentHTML('afterbegin', fileHtml);
                        }
                    }
                }

                // Emit to socket
                socket.emit('send-message', {
                    conversationId: conversationId,
                    id: saved.id,
                    content: content,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    created_at: saved.created_at || new Date().toISOString(),
                    file_url: saved.file_url,
                    file_name: saved.file_name,
                    file_type: saved.file_type,
                    reply_to: savedReplyTo
                });
            } catch (err) {
                console.error('Send failed:', err);
                var tempEl = document.getElementById('msg-' + tempId);
                if (tempEl) {
                    var timeEl = tempEl.querySelector('.msg-time');
                    if (timeEl) timeEl.textContent = 'Failed to send';
                }
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
        html += '<small class="msg-time" style="opacity:.5;font-size:.7rem">' + formatTime(msg.created_at) + (msg.pending ? ' · Sending…' : '') + '</small>';
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
            return '<a href="' + url + '" target="_blank"><img src="' + url + '" alt="' + escapeHtml(name || 'Image') + '" style="max-width:100%;border-radius:8px;margin-bottom:4px;max-height:200px"></a>';
        }
        var icon = 'bi-file-earmark';
        if (type === 'application/pdf') icon = 'bi-file-earmark-pdf-fill';
        else if (type && (type.includes('zip') || type.includes('rar'))) icon = 'bi-file-earmark-zip-fill';
        return '<a href="' + url + '" target="_blank" class="msg-file-preview"><i class="bi ' + icon + '"></i><span style="font-size:.8rem">' + escapeHtml(name || 'File') + '</span></a>';
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
