/**
 * AI posting helper — lives on gig-create and job-create pages.
 * 1. Chat panel: user describes what they want to post; /api/ai/posting
 *    keeps asking until all required fields are valid, then fills the form.
 * 2. Draft handoff: reads #ai=<base64 fields> set by the main AI chat and
 *    prefills the form the same way.
 */
(function () {
    var helper = document.getElementById('aiPostHelper');

    // ─── Fill the actual create form from validated fields ───
    function setField(id, value) {
        var el = document.getElementById(id);
        if (!el || value === undefined || value === null || value === '') return;
        el.value = value;
        el.dispatchEvent(new Event('change'));
    }

    function fillForm(mode, f) {
        if (mode === 'job') {
            setField('category_id', f.category_id);
            setField('event_type', f.event_type);
            setField('description', f.description);
            setField('event_date', f.event_date);
            setField('event_location', f.event_location);
            setField('venue', f.venue);
            setField('budget_min', f.budget_min);
            setField('budget_max', f.budget_max);
            setField('proposal_deadline', f.proposal_deadline);
            setField('special_requirements', f.special_requirements);
            // Jump the wizard to the review step so the user can edit, post or save as draft
            if (typeof window.goStep === 'function') window.goStep(3);
        } else {
            setField('title', f.title);
            setField('category_id', f.category_id);
            setField('description', f.description);
            setField('starting_price', f.starting_price);
            setField('delivery_time', f.delivery_time);
            // Make sure the filled fields (step 1) are visible
            if (typeof window.goToStep === 'function') window.goToStep(1);
        }
        var form = document.getElementById(mode === 'job' ? 'jobForm' : 'gigForm');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ─── Draft handoff from the main AI chat (#ai=base64) ────
    var mode = helper ? helper.dataset.aiMode : (document.getElementById('jobForm') ? 'job' : 'gig');
    if (window.location.hash.indexOf('#ai=') === 0) {
        try {
            var b64 = window.location.hash.slice(4).replace(/-/g, '+').replace(/_/g, '/');
            var fields = JSON.parse(atob(b64));
            history.replaceState(null, '', window.location.pathname);
            // Let page init scripts (min dates, wizard) run first
            setTimeout(function () { fillForm(mode, fields); }, 50);
        } catch (e) { /* bad hash — ignore */ }
    }

    // ─── Chat panel ───────────────────────────────────────────
    if (!helper) return;
    var body = document.getElementById('aiPostBody');
    var toggle = document.getElementById('aiPostToggle');
    var messagesEl = document.getElementById('aiPostMessages');
    var form = document.getElementById('aiPostForm');
    var input = document.getElementById('aiPostInput');
    var sendBtn = document.getElementById('aiPostSend');
    var history_ = [];
    var busy = false;
    var greeted = false;

    function addMsg(role, text, cls) {
        var div = document.createElement('div');
        div.className = 'ai-post-msg ai-post-msg--' + (cls || (role === 'user' ? 'user' : 'bot'));
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
        var t = document.createElement('div');
        t.className = 'ai-post-typing';
        t.setAttribute('data-typing', '');
        t.textContent = 'Thinking…';
        messagesEl.appendChild(t);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function hideTyping() {
        var t = messagesEl.querySelector('[data-typing]');
        if (t) t.remove();
    }

    toggle.addEventListener('click', function () {
        var opening = body.classList.contains('d-none');
        body.classList.toggle('d-none');
        helper.classList.toggle('is-open', opening);
        if (opening && !greeted) {
            greeted = true;
            addMsg('assistant', mode === 'job'
                ? 'Tell me about your event — what you need, where, when, and your budget. I\'ll ask for anything missing and then fill the form for you.'
                : 'Describe the service you offer — what you do, what\'s included, and your starting price. I\'ll ask for anything missing and then fill the form for you.');
        }
        if (opening) input.focus();
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text || busy) return;
        input.value = '';
        busy = true;
        sendBtn.disabled = true;

        history_.push({ role: 'user', content: text });
        addMsg('user', text);
        showTyping();

        try {
            var res = await fetch('/api/ai/posting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: mode, messages: history_.slice(-12) }),
            });
            var data = await res.json().catch(function () { return {}; });
            hideTyping();

            if (!res.ok) {
                addMsg('assistant', data.error || 'The assistant is unavailable right now.');
            } else {
                history_.push({ role: 'assistant', content: data.reply });
                addMsg('assistant', data.reply);
                if (data.complete && data.fields) {
                    fillForm(mode, data.fields);
                    addMsg('assistant', '✅ Form filled in below — review it, edit anything you like, then post it or save it as a draft.', 'done');
                }
            }
        } catch (err) {
            hideTyping();
            addMsg('assistant', 'Network error — could not reach the assistant.');
        }

        busy = false;
        sendBtn.disabled = false;
        input.focus();
    });
})();
