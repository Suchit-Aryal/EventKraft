/**
 * EventKraft AI Assistant — floating chat widget
 * Talks to POST /api/ai/chat; renders gig suggestion cards.
 * History persists in sessionStorage across page navigation.
 */
(function () {
  const widget = document.getElementById('ekAiWidget');
  if (!widget) return;

  const toggle = document.getElementById('ekAiToggle');
  const panel = document.getElementById('ekAiPanel');
  const closeBtn = document.getElementById('ekAiClose');
  const clearBtn = document.getElementById('ekAiClear');
  const messagesEl = document.getElementById('ekAiMessages');
  const form = document.getElementById('ekAiForm');
  const input = document.getElementById('ekAiInput');
  const sendBtn = document.getElementById('ekAiSend');

  const STORAGE_KEY = 'ek-ai-history';
  const MAX_HISTORY = 12; // messages sent to the API

  // history entries: { role: 'user'|'assistant', content, gigs?: [...] }
  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || []; } catch (e) {}

  let busy = false;

  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30))); } catch (e) {}
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addBubble(role, text, isError) {
    const div = document.createElement('div');
    div.className = 'ek-ai-msg ' + (role === 'user' ? 'ek-ai-msg--user' : 'ek-ai-msg--bot') + (isError ? ' ek-ai-msg--error' : '');
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addGigCards(gigs) {
    (gigs || []).forEach(function (g) {
      const a = document.createElement('a');
      a.className = 'ek-ai-gigcard';
      a.href = g.url;

      const img = document.createElement('img');
      img.src = g.image || '/img/placeholder.png';
      img.alt = '';
      img.onerror = function () { this.style.visibility = 'hidden'; };

      const body = document.createElement('div');
      body.className = 'ek-ai-gigcard-body';

      const title = document.createElement('div');
      title.className = 'ek-ai-gigcard-title';
      title.textContent = g.title;

      const meta = document.createElement('div');
      meta.className = 'ek-ai-gigcard-meta';
      meta.textContent = (g.category || 'Service') + (g.worker ? ' · ' + g.worker : '') + (g.rating ? ' · ★ ' + Number(g.rating).toFixed(1) : '');

      const price = document.createElement('div');
      price.className = 'ek-ai-gigcard-price';
      price.textContent = 'From NPR ' + Number(g.price).toLocaleString();

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(price);
      a.appendChild(img);
      a.appendChild(body);
      messagesEl.appendChild(a);
    });
    scrollToBottom();
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'ek-ai-typing';
    t.id = 'ekAiTyping';
    t.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(t);
    scrollToBottom();
  }

  function hideTyping() {
    const t = document.getElementById('ekAiTyping');
    if (t) t.remove();
  }

  function renderAll() {
    messagesEl.innerHTML = '';
    if (history.length === 0) {
      addBubble('assistant', 'Namaste! I\'m the EventKraft Assistant. Tell me about your event or budget and I\'ll suggest the right services — e.g. "I have NPR 20,000 for a small wedding."');
      return;
    }
    history.forEach(function (m) {
      addBubble(m.role, m.content);
      if (m.gigs && m.gigs.length) addGigCards(m.gigs);
    });
  }

  async function send(text) {
    busy = true;
    sendBtn.disabled = true;
    input.disabled = true;

    history.push({ role: 'user', content: text });
    save();
    addBubble('user', text);
    showTyping();

    try {
      const payload = history.slice(-MAX_HISTORY).map(function (m) {
        return { role: m.role, content: m.content };
      });
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json().catch(function () { return {}; });
      hideTyping();

      if (!res.ok) {
        addBubble('assistant', data.error || 'The assistant is unavailable right now. Please try again later.', true);
      } else {
        history.push({ role: 'assistant', content: data.text, gigs: data.gigs });
        save();
        addBubble('assistant', data.text);
        addGigCards(data.gigs);
      }
    } catch (e) {
      hideTyping();
      addBubble('assistant', 'Network error — could not reach the assistant.', true);
    }

    busy = false;
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }

  toggle.addEventListener('click', function () {
    const opening = panel.hidden;
    panel.hidden = !panel.hidden;
    if (opening) {
      renderAll();
      scrollToBottom();
      input.focus();
    }
  });

  closeBtn.addEventListener('click', function () { panel.hidden = true; });

  clearBtn.addEventListener('click', function () {
    history = [];
    save();
    renderAll();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    send(text);
  });
})();
