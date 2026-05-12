(function () {
  'use strict';

  // ── Config from site ────────────────────────────────────────────────────────
  var cfg = window.ChatFlowConfig || {};
  var PROJECT_ID  = cfg.projectId || 'chat-web-4e49d';
  var COLOR       = cfg.color     || '#2563EB';
  var BOT_NAME    = cfg.botName   || 'Asistente';
  var GREETING    = cfg.greeting  || '¡Hola! ¿En qué puedo ayudarte?';
  var POSITION    = cfg.position  || 'right';
  var AUTO_OPEN   = cfg.autoOpen  || false;

  // ── Firebase REST API (no SDK needed) ───────────────────────────────────────
  var API_KEY   = 'AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko';
  var DB_URL    = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';

  var convId    = null;
  var visitorId = getOrCreateVisitorId();
  var geo       = null;

  function getOrCreateVisitorId() {
    try {
      var id = localStorage.getItem('_cf_vid');
      if (!id) { id = 'v-' + Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem('_cf_vid', id); }
      return id;
    } catch(e) { return 'v-' + Math.random().toString(36).slice(2); }
  }

  // ── Geo fetch ───────────────────────────────────────────────────────────────
  function fetchGeo(cb) {
    fetch('https://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon,isp,query')
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.status === 'success') cb({ ip:d.query, city:d.city, region:d.regionName, country:d.country, zip:d.zip, lat:d.lat, lon:d.lon, isp:d.isp }); else cb(null); })
      .catch(function() { cb(null); });
  }

  // ── Firestore helpers ───────────────────────────────────────────────────────
  function fsSet(path, data) {
    var fields = toFields(data);
    return fetch(DB_URL + '/' + path + '?key=' + API_KEY, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    });
  }

  function fsAdd(path, data) {
    return fetch(DB_URL + '/' + path + '?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(data) })
    });
  }

  function toFields(obj) {
    var fields = {};
    Object.keys(obj).forEach(function(k) {
      var v = obj[k];
      if (v === null || v === undefined) return;
      if (typeof v === 'string')  fields[k] = { stringValue: v };
      else if (typeof v === 'number')  fields[k] = { integerValue: String(Math.round(v)) };
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      else if (typeof v === 'object')  fields[k] = { mapValue: { fields: toFields(v) } };
    });
    return fields;
  }

  // ── Create conversation in Firestore ────────────────────────────────────────
  function createConversation(name, email, cb) {
    var data = {
      visitorId:    visitorId,
      visitorName:  name || 'Visitante',
      visitorEmail: email || '',
      visitorOnline: true,
      status:       'open',
      lastMsg:      GREETING,
      lastAt:       Date.now(),
      unread:       1,
      page:         window.location.href,
      geo:          geo || {},
      createdAt:    Date.now(),
    };
    fsAdd('conversations', data)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        // extract ID from name field "projects/.../documents/conversations/ID"
        var parts = d.name ? d.name.split('/') : [];
        convId = parts[parts.length - 1];
        // send greeting
        addMessage('bot', GREETING);
        cb && cb(convId);
      })
      .catch(function(e) { console.error('ChatFlow:', e); });
  }

  function addMessage(from, text, senderName) {
    if (!convId) return;
    var data = {
      text:       text,
      from:       from,
      senderName: senderName || (from === 'bot' ? BOT_NAME : 'Visitante'),
      createdAt:  Date.now(),
    };
    fsAdd('conversations/' + convId + '/messages', data);
    if (from !== 'bot') {
      fsSet('conversations/' + convId, {
        lastMsg:      text,
        lastAt:       Date.now(),
        unread:       1,
        visitorOnline: true,
      });
    }
  }

  // Poll for new agent messages
  var lastMsgTs = Date.now();
  function pollMessages() {
    if (!convId) return;
    fetch(DB_URL + '/conversations/' + convId + '/messages?key=' + API_KEY + '&orderBy=createdAt&pageSize=20')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.documents) return;
        d.documents.forEach(function(doc) {
          var f = doc.fields || {};
          var from = f.from ? f.from.stringValue : '';
          var ts   = f.createdAt ? parseInt(f.createdAt.integerValue) : 0;
          var text = f.text ? f.text.stringValue : '';
          if (from === 'agent' && ts > lastMsgTs) {
            lastMsgTs = ts;
            appendMessage('agent', text, f.agentName ? f.agentName.stringValue : 'Agente');
          }
        });
      })
      .catch(function() {});
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  var isOpen       = false;
  var isMinimized  = false;
  var nameCollected = false;
  var visitorName   = '';
  var widget, chatBox, msgsEl, inputEl, formEl;

  function darken(hex, pct) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, (n >> 16) - pct);
    var g = Math.max(0, ((n >> 8) & 0xff) - pct);
    var b = Math.max(0, (n & 0xff) - pct);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  var DARK = darken(COLOR, 30);

  var css = `
    #cf-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #cf-btn {
      position: fixed; ${POSITION}: 20px; bottom: 20px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${COLOR}; border: none; cursor: pointer;
      box-shadow: 0 4px 20px ${COLOR}66;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #cf-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px ${COLOR}88; }
    #cf-btn svg { transition: transform 0.3s; }
    #cf-badge {
      position: absolute; top: -4px; right: -4px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #EF4444; color: #fff; font-size: 10px; font-weight: 700;
      display: none; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }
    #cf-box {
      position: fixed; ${POSITION}: 20px; bottom: 86px; z-index: 99998;
      width: 340px; height: 480px; border-radius: 16px;
      background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.18);
      display: none; flex-direction: column; overflow: hidden;
      animation: cfSlideUp 0.25s ease;
    }
    @keyframes cfSlideUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
    #cf-header {
      background: linear-gradient(135deg, ${COLOR}, ${DARK});
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #cf-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #cf-header-info { flex: 1; }
    #cf-header-name { color: #fff; font-weight: 700; font-size: 14px; line-height: 1.2; }
    #cf-header-status { color: rgba(255,255,255,0.75); font-size: 11px; display: flex; align-items: center; gap: 4px; }
    #cf-header-status::before { content:''; width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block; }
    #cf-close { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 20px; line-height: 1; padding: 4px; }
    #cf-close:hover { color: #fff; }
    #cf-msgs {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8f9fb;
    }
    #cf-msgs::-webkit-scrollbar { width: 3px; }
    #cf-msgs::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
    .cf-msg { display: flex; gap: 7px; align-items: flex-end; max-width: 85%; }
    .cf-msg.cf-user { align-self: flex-end; flex-direction: row-reverse; }
    .cf-msg-av { width: 26px; height: 26px; border-radius: 50%; background: ${COLOR}22; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; color: ${COLOR}; font-weight: 700; }
    .cf-msg-body { }
    .cf-msg-name { font-size: 10px; color: #94a3b8; margin-bottom: 3px; }
    .cf-msg-text {
      padding: 9px 13px; border-radius: 14px; font-size: 13px; line-height: 1.5; word-break: break-word;
    }
    .cf-bot .cf-msg-text { background: #fff; color: #1e293b; border-radius: 2px 14px 14px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
    .cf-agent .cf-msg-text { background: #fff; color: #1e293b; border-radius: 2px 14px 14px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
    .cf-user .cf-msg-text { background: ${COLOR}; color: #fff; border-radius: 14px 14px 2px 14px; }
    .cf-typing .cf-msg-text { padding: 10px 14px; }
    .cf-dots { display: flex; gap: 3px; align-items: center; }
    .cf-dot { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; animation: cfBounce 1.2s infinite; }
    .cf-dot:nth-child(2) { animation-delay: 0.2s; }
    .cf-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes cfBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
    #cf-name-form { padding: 14px; border-top: 1px solid #f0f0f0; background: #fff; flex-shrink: 0; }
    #cf-name-form p { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    #cf-name-form input {
      width: 100%; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 8px 12px; font-size: 13px; outline: none; margin-bottom: 8px;
      font-family: inherit; color: #1e293b;
    }
    #cf-name-form input:focus { border-color: ${COLOR}; }
    #cf-name-form button {
      width: 100%; background: ${COLOR}; border: none; border-radius: 8px;
      padding: 9px; color: #fff; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit;
    }
    #cf-input-row {
      padding: 10px 12px; border-top: 1px solid #f0f0f0;
      background: #fff; display: flex; gap: 8px; align-items: center; flex-shrink: 0;
    }
    #cf-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 20px;
      padding: 8px 14px; font-size: 13px; outline: none; resize: none;
      font-family: inherit; color: #1e293b; max-height: 80px; line-height: 1.4;
    }
    #cf-input:focus { border-color: ${COLOR}; }
    #cf-send {
      width: 36px; height: 36px; border-radius: 50%; background: ${COLOR};
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s;
    }
    #cf-send:hover { background: ${DARK}; }
    #cf-powered { text-align: center; padding: 4px 0 6px; font-size: 10px; color: #cbd5e1; background: #fff; }
  `;

  function buildWidget() {
    // Inject CSS
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Container
    widget = document.createElement('div');
    widget.id = 'cf-widget';
    document.body.appendChild(widget);

    // Button
    var btn = document.createElement('button');
    btn.id = 'cf-btn';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.innerHTML = `
      <svg id="cf-icon-chat" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg id="cf-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" style="display:none">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <div id="cf-badge"></div>
    `;
    btn.onclick = toggleChat;
    widget.appendChild(btn);

    // Chat box
    chatBox = document.createElement('div');
    chatBox.id = 'cf-box';
    chatBox.innerHTML = `
      <div id="cf-header">
        <div id="cf-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div id="cf-header-info">
          <div id="cf-header-name">${BOT_NAME}</div>
          <div id="cf-header-status">En línea</div>
        </div>
        <button id="cf-close" onclick="document.getElementById('cf-btn').click()" aria-label="Cerrar">✕</button>
      </div>
      <div id="cf-msgs"></div>
      <div id="cf-name-form">
        <p>¿Cómo te llamás? (opcional)</p>
        <input id="cf-name-input" type="text" placeholder="Tu nombre" maxlength="60"/>
        <button id="cf-name-btn">Iniciar chat →</button>
      </div>
      <div id="cf-input-row" style="display:none">
        <textarea id="cf-input" placeholder="Escribí un mensaje..." rows="1"></textarea>
        <button id="cf-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div id="cf-powered">Powered by ChatFlow</div>
    `;
    widget.appendChild(chatBox);

    msgsEl  = chatBox.querySelector('#cf-msgs');
    inputEl = chatBox.querySelector('#cf-input');
    formEl  = chatBox.querySelector('#cf-name-form');

    // Name form submit
    chatBox.querySelector('#cf-name-btn').onclick = startChat;
    chatBox.querySelector('#cf-name-input').onkeydown = function(e) {
      if (e.key === 'Enter') startChat();
    };

    // Send message
    chatBox.querySelector('#cf-send').onclick = sendUserMessage;
    inputEl.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    };
    // Auto-resize textarea
    inputEl.oninput = function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    };

    // Show greeting bubble after 3s if not open
    setTimeout(function() {
      showBubble();
    }, 3000);

    if (AUTO_OPEN) setTimeout(function() { toggleChat(); }, 1000);
  }

  function showBubble() {
    if (isOpen) return;
    var badge = document.getElementById('cf-badge');
    if (badge) { badge.style.display = 'flex'; badge.textContent = '1'; }
  }

  function toggleChat() {
    isOpen = !isOpen;
    chatBox.style.display = isOpen ? 'flex' : 'none';
    document.getElementById('cf-icon-chat').style.display = isOpen ? 'none' : 'block';
    document.getElementById('cf-icon-close').style.display = isOpen ? 'block' : 'none';
    var badge = document.getElementById('cf-badge');
    if (badge) badge.style.display = 'none';
    if (isOpen && msgsEl.children.length === 0) {
      // Show greeting
      setTimeout(function() {
        appendTyping();
        setTimeout(function() {
          removeTyping();
          appendMessage('bot', GREETING);
        }, 1000);
      }, 300);
    }
  }

  function startChat() {
    var nameInput = chatBox.querySelector('#cf-name-input');
    visitorName = (nameInput ? nameInput.value.trim() : '') || 'Visitante';
    nameCollected = true;
    formEl.style.display = 'none';
    chatBox.querySelector('#cf-input-row').style.display = 'flex';
    inputEl.focus();
    // Create conversation in Firestore
    createConversation(visitorName, '', null);
    // Start polling for agent replies
    setInterval(pollMessages, 3000);
  }

  function sendUserMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    appendMessage('user', text);
    if (!convId) {
      // create conv first time
      if (!nameCollected) { visitorName = 'Visitante'; nameCollected = true; formEl.style.display = 'none'; chatBox.querySelector('#cf-input-row').style.display = 'flex'; }
      createConversation(visitorName, '', function() { addMessage('visitor', text, visitorName); });
    } else {
      addMessage('visitor', text, visitorName);
    }
    // Auto-reply if no agent
    setTimeout(function() {
      appendTyping();
      setTimeout(function() {
        removeTyping();
        appendMessage('bot', 'Gracias por tu mensaje. Un agente te va a responder pronto.');
      }, 1800);
    }, 600);
  }

  var typingEl = null;
  function appendTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'cf-msg cf-bot cf-typing';
    typingEl.innerHTML = '<div class="cf-msg-av">●</div><div class="cf-msg-body"><div class="cf-msg-text"><div class="cf-dots"><div class="cf-dot"></div><div class="cf-dot"></div><div class="cf-dot"></div></div></div></div>';
    msgsEl.appendChild(typingEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function removeTyping() {
    if (typingEl && typingEl.parentNode) { typingEl.parentNode.removeChild(typingEl); typingEl = null; }
  }

  function appendMessage(from, text, name) {
    var isUser  = from === 'user' || from === 'visitor';
    var isAgent = from === 'agent';
    var div = document.createElement('div');
    div.className = 'cf-msg ' + (isUser ? 'cf-user' : isAgent ? 'cf-agent' : 'cf-bot');
    var initial = isUser ? (visitorName ? visitorName[0].toUpperCase() : 'V') : (isAgent ? (name||'A')[0].toUpperCase() : BOT_NAME[0].toUpperCase());
    var nameLabel = isUser ? '' : ('<div class="cf-msg-name">' + (isAgent ? (name||'Agente') : BOT_NAME) + '</div>');
    div.innerHTML = '<div class="cf-msg-av">' + initial + '</div><div class="cf-msg-body">' + nameLabel + '<div class="cf-msg-text">' + escHtml(text) + '</div></div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function escHtml(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    buildWidget();
    fetchGeo(function(g) { geo = g; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
