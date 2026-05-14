/**
 * ChatFlow Widget — Script embebible
 * Pegá esto en tu sitio antes de </body>
 *
 * Uso:
 * <script>
 *   window.ChatFlowConfig = {
 *     projectId: "chat-web-4e49d",
 *     apiKey: "AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko",
 *     color: "#2563EB",
 *     botName: "Asistente",
 *     position: "right",
 *     autoOpen: false,
 *     greeting: "¡Hola! ¿En qué puedo ayudarte?",
 *   };
 * </script>
 * <script src="https://punto-stock-chat.vercel.app/widget.js" async></script>
 */

(function () {
  const cfg = window.ChatFlowConfig || {};
  const PROJECT_ID = cfg.projectId || 'chat-web-4e49d';
  const API_KEY    = cfg.apiKey    || 'AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko';
  const COLOR      = cfg.color     || '#2563EB';
  const BOT_NAME   = cfg.botName   || 'Asistente';
  const POSITION   = cfg.position  || 'right';
  const AUTO_OPEN  = cfg.autoOpen  || false;
  const GREETING   = cfg.greeting  || '¡Hola! ¿En qué puedo ayudarte?';

  // ── Firebase REST helpers (no SDK needed) ──────────────────
  const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  async function fsGet(path) {
    const r = await fetch(`${FS}/${path}?key=${API_KEY}`);
    return r.ok ? r.json() : null;
  }

  async function fsAdd(path, data) {
    const r = await fetch(`${FS}/${path}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestore(data))
    });
    return r.ok ? r.json() : null;
  }

  async function fsPatch(path, data) {
    const fields = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const r = await fetch(`${FS}/${path}?key=${API_KEY}&${fields}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestore(data))
    });
    return r.ok ? r.json() : null;
  }

  // Poll messages (Firestore REST doesn't support real-time, so we poll)
  let pollInterval = null;

  // Track which message IDs we've already shown
  let shownMsgIds = new Set();

  async function pollMessages(convId, onNew) {
    if (pollInterval) clearInterval(pollInterval);

    console.log('[ChatFlow] Starting poll for convId:', convId);

    // First poll: mark all existing as seen
    try {
      const r = await fetch(`${FS}/conversations/${convId}/messages?key=${API_KEY}`);
      if (r.ok) {
        const data = await r.json();
        (data.documents || []).forEach(d => {
          const id = d.name?.split('/').pop();
          if (id) shownMsgIds.add(id);
        });
        console.log('[ChatFlow] Initial messages marked as seen:', shownMsgIds.size);
      } else {
        const err = await r.text();
        console.warn('[ChatFlow] First poll error:', r.status, err);
      }
    } catch(e) {
      console.warn('[ChatFlow] First poll exception:', e);
    }

    // Poll every 1.5s for new messages
    pollInterval = setInterval(async () => {
      try {
        const r = await fetch(`${FS}/conversations/${convId}/messages?key=${API_KEY}`);
        if (!r.ok) {
          console.warn('[ChatFlow] Poll error:', r.status);
          return;
        }
        const data = await r.json();
        const docs = data.documents || [];

        docs.forEach(d => {
          const id = d.name?.split('/').pop();
          if (!id || shownMsgIds.has(id)) return;
          shownMsgIds.add(id);
          const msg = fromFirestore(d);
          console.log('[ChatFlow] New message received:', msg.from, msg.text?.slice(0,30));
          if (msg.from === 'agent') {
            console.log('[ChatFlow] Agent message — showing to visitor');
            onNew(msg);
          }
        });
      } catch (e) {
        console.warn('[ChatFlow] Poll exception:', e);
      }
    }, 1500);
  }

  // Convert JS object to Firestore format
  function toFirestore(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string')  fields[k] = { stringValue: v };
      if (typeof v === 'number')  fields[k] = { integerValue: v };
      if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      if (v === null)             fields[k] = { nullValue: null };
    }
    return { fields };
  }

  // Convert Firestore doc to JS object
  function fromFirestore(doc) {
    const obj = { _id: doc.name?.split('/').pop() };
    for (const [k, v] of Object.entries(doc.fields || {})) {
      obj[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.timestampValue ?? null;
    }
    return obj;
  }

  // ── Geo ────────────────────────────────────────────────────
  async function getGeo() {
    // Intentar con varias APIs en orden hasta que una funcione
    const APIs = [
      async () => {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        if (d.city) return { country: d.country_name, city: d.city, region: d.region, isp: d.org, ip: d.ip };
      },
      async () => {
        const r = await fetch('https://ipwho.is/');
        const d = await r.json();
        if (d.success) return { country: d.country, city: d.city, region: d.region, isp: d.connection?.isp, ip: d.ip };
      },
      async () => {
        const r = await fetch('https://api.ipify.org?format=json');
        const d = await r.json();
        if (d.ip) {
          const r2 = await fetch(`https://ipwho.is/${d.ip}`);
          const d2 = await r2.json();
          if (d2.success) return { country: d2.country, city: d2.city, region: d2.region, isp: d2.connection?.isp, ip: d.ip };
        }
      }
    ];
    for (const api of APIs) {
      try {
        const result = await api();
        if (result?.city) {
          console.log('[ChatFlow] Geo OK:', result.city, result.country);
          return result;
        }
      } catch {}
    }
    console.warn('[ChatFlow] Geo failed — all APIs unavailable');
    return null;
  }

  // ── Bot engine — ejecuta flujos guardados en Firestore ──────
  // Flujo por defecto si no hay flujos guardados
  const DEFAULT_FLOW = [
    { type: 'message', text: GREETING },
    {
      type: 'options',
      text: '¿En qué te puedo ayudar?',
      options: ['Consultar precios', 'Soporte técnico', 'Hablar con un agente']
    }
  ];

  let flowState = { step: 0, flow: DEFAULT_FLOW, waitingInput: false };

  function getBotReply(userMsg) {
    const msg = (userMsg || '').toLowerCase().trim();
    const step = flowState.flow[flowState.step];
    if (!step) return null;

    // Si el paso actual es de opciones, buscar coincidencia
    if (step.type === 'options') {
      const opts = step.options || [];
      const match = opts.findIndex(o =>
        o.toLowerCase().includes(msg) || msg.includes(o.toLowerCase()) ||
        msg === String(opts.indexOf(o) + 1)
      );

      if (match !== -1) {
        flowState.step++;
        const next = flowState.flow[flowState.step];
        if (next?.type === 'message') {
          flowState.step++;
          return { text: next.text };
        }
        if (next?.type === 'agent') {
          return { text: next.message || 'Un agente te atenderá pronto.' };
        }
        return null;
      }

      // No reconoció la opción
      return { text: `Por favor elegí una de las opciones: ${opts.map((o, i) => `${i + 1}. ${o}`).join(', ')}` };
    }

    // Respuestas por palabras clave
    if (msg.match(/hola|buenas|buen|hey/)) return { text: '¡Hola! ¿En qué te puedo ayudar?' };
    if (msg.match(/precio|costo|cuanto|vale/)) return { text: 'Los precios varían según el plan. ¿Querés que te cuente más?' };
    if (msg.match(/agente|humano|persona|ayuda/)) return { text: 'Te conecto con un agente ahora mismo. Un momento...' };
    if (msg.match(/gracias|ok|bien|perfecto/)) return { text: '¡De nada! ¿Hay algo más en que pueda ayudarte?' };
    if (msg.match(/chau|adios|hasta|bye/)) return { text: '¡Hasta luego! Que tengas un excelente día.' };

    return { text: 'Entendido. Un agente revisará tu mensaje y te responderá a la brevedad.' };
  }

  // ── Estado de la conversación ───────────────────────────────
  let convId = null;
  let visitorName = 'Visitante';
  let isOpen = false;
  let msgs = [];

  // ── UI ─────────────────────────────────────────────────────
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const DARK  = '#0F172A';
  const LIGHT = '#F8FAFC';

  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #cf-widget * { box-sizing: border-box; font-family: ${FONT}; }
      #cf-widget input, #cf-widget textarea { font-family: ${FONT}; }
      #cf-btn { transition: transform 0.2s, box-shadow 0.2s; }
      #cf-btn:hover { transform: scale(1.08); }
      #cf-msgs { scroll-behavior: smooth; }
      .cf-msg-enter { animation: cfIn 0.2s ease; }
      @keyframes cfIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
      .cf-opt-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      .cf-opt-btn { transition: all 0.15s; }
      #cf-typing span { animation: cfDot 1.2s infinite; display:inline-block; }
      #cf-typing span:nth-child(2) { animation-delay: 0.2s; }
      #cf-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes cfDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
    `;
    document.head.appendChild(s);
  }

  function buildWidget() {
    const div = document.createElement('div');
    div.id = 'cf-widget';
    div.style.cssText = `position:fixed;bottom:20px;${POSITION}:20px;z-index:999999;display:flex;flex-direction:column;align-items:${POSITION === 'right' ? 'flex-end' : 'flex-start'};gap:10px;`;

    // Chat window
    div.innerHTML = `
      <div id="cf-box" style="display:none;width:340px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);overflow:hidden;flex-direction:column;">
        <!-- Header -->
        <div style="background:${COLOR};padding:14px 16px;display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style="flex:1;">
            <div style="color:white;font-weight:700;font-size:14px;">${BOT_NAME}</div>
            <div style="color:rgba(255,255,255,0.75);font-size:11px;display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;"></span>
              En línea
            </div>
          </div>
          <button id="cf-close" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;line-height:1;">×</button>
        </div>
        <!-- Messages -->
        <div id="cf-msgs" style="height:320px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#F8FAFC;"></div>
        <!-- Typing indicator (hidden) -->
        <div id="cf-typing" style="display:none;padding:6px 14px;background:#F8FAFC;">
          <div style="background:white;border:1px solid #E2E8F0;border-radius:12px 12px 12px 2px;padding:8px 12px;display:inline-flex;gap:4px;align-items:center;">
            <span style="width:7px;height:7px;border-radius:50%;background:${COLOR};">.</span>
            <span style="width:7px;height:7px;border-radius:50%;background:${COLOR};">.</span>
            <span style="width:7px;height:7px;border-radius:50%;background:${COLOR};">.</span>
          </div>
        </div>
        <!-- Input -->
        <div style="padding:10px 12px;border-top:1px solid #E2E8F0;background:white;display:flex;gap:8px;align-items:flex-end;">
          <textarea id="cf-input" rows="1" placeholder="Escribí tu mensaje..." style="flex:1;border:1px solid #E2E8F0;border-radius:10px;padding:9px 12px;font-size:13px;outline:none;resize:none;max-height:80px;line-height:1.4;color:${DARK};background:#F8FAFC;"></textarea>
          <button id="cf-send" style="width:36px;height:36px;border-radius:10px;background:${COLOR};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      <!-- Launcher button -->
      <button id="cf-btn" style="width:52px;height:52px;border-radius:50%;background:${COLOR};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px ${COLOR}66;">
        <svg id="cf-ico-chat" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <svg id="cf-ico-close" style="display:none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    document.body.appendChild(div);
    return div;
  }

  function addMsg(text, from = 'bot', opts = null) {
    const isBot      = from === 'bot';
    const isAgent    = from === 'agent-reply';
    const isVisitor  = from === 'visitor';
    const isLeft     = isBot || isAgent;
    const wrap = document.createElement('div');
    wrap.className = 'cf-msg-enter';
    wrap.style.cssText = `display:flex;gap:7px;align-items:flex-end;justify-content:${isLeft ? 'flex-start' : 'flex-end'};`;

    const bubbleColor   = isVisitor ? COLOR : isAgent ? '#10B981' : 'white';
    const bubbleBorder  = isVisitor ? 'none' : `1px solid ${isAgent ? '#10B98133' : '#E2E8F0'}`;
    const textColor     = isVisitor ? 'white' : DARK;
    const borderRadius  = isLeft ? '12px 12px 12px 2px' : '12px 12px 2px 12px';
    const iconColor     = isAgent ? '#10B981' : COLOR;
    const iconPath      = isAgent
      ? `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`
      : `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`;

    if (isLeft) {
      wrap.innerHTML = `
        <div style="width:26px;height:26px;border-radius:50%;background:${iconColor}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5">${iconPath}</svg>
        </div>
        <div style="max-width:72%;">
          ${isAgent ? `<div style="font-size:10px;color:#10B981;font-weight:700;margin-bottom:3px;">Agente humano</div>` : ''}
          <div style="background:${bubbleColor};border:${bubbleBorder};border-radius:${borderRadius};padding:9px 13px;font-size:13px;color:${textColor};line-height:1.5;">${text}</div>
          ${opts ? `<div style="display:flex;flex-direction:column;gap:5px;margin-top:6px;">${opts.map(o => `<button class="cf-opt-btn" data-opt="${o}" style="background:${COLOR};color:white;border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;text-align:left;">${o}</button>`).join('')}</div>` : ''}
        </div>
      `;
    } else {
      wrap.innerHTML = `
        <div style="max-width:72%;">
          <div style="background:${bubbleColor};border:${bubbleBorder};border-radius:${borderRadius};padding:9px 13px;font-size:13px;color:${textColor};line-height:1.5;">${text}</div>
        </div>
      `;
    }

    const msgsEl = document.getElementById('cf-msgs');
    msgsEl.appendChild(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    msgs.push({ text, from });

    // Bind option buttons
    if (opts) {
      wrap.querySelectorAll('.cf-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.opt;
          btn.closest('div[style*="flex-direction:column"]').remove();
          send(val);
        });
      });
    }
  }

  function showTyping(show) {
    const el = document.getElementById('cf-typing');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  async function initConversation() {
    const geo = await getGeo();
    const doc = await fsAdd('conversations', {
      visitorName,
      visitorOnline: true,
      status: 'open',
      lastMsg: '',
      unread: 0,
      page: window.location.href,
      createdAt: new Date().toISOString(),
      lastAt: new Date().toISOString(),
    });

    if (doc) {
      convId = doc.name?.split('/').pop();

      // Update with geo
      if (geo && convId) {
        await fsPatch(`conversations/${convId}`, { geoCity: geo.city || '', geoCountry: geo.country || '', geoIsp: geo.isp || '', geoIp: geo.ip || '' });
      }

      // Poll for agent messages
      pollMessages(convId, (msg) => {
        if (msg.from === 'agent') {
          showTyping(false);
          addMsg(msg.text, 'agent-reply');
        }
      });
    }
  }

  async function sendToFirestore(text) {
    if (!convId) return;
    await fsAdd(`conversations/${convId}/messages`, {
      text,
      from: 'visitor',
      senderName: visitorName,
      createdAt: new Date().toISOString(),
    });
    await fsPatch(`conversations/${convId}`, {
      lastMsg: text,
      lastAt: new Date().toISOString(),
      unread: (msgs.filter(m => m.from === 'visitor').length) + 1,
      visitorOnline: true,
    });
  }

  async function send(text) {
    if (!text?.trim()) return;
    addMsg(text, 'visitor');

    // Init conversation on first message
    if (!convId) await initConversation();

    // Save to Firestore
    await sendToFirestore(text);

    // Bot reply after delay
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      const reply = getBotReply(text);
      if (reply) {
        addMsg(reply.text, 'bot', reply.options || null);
        // Save bot reply to Firestore too
        if (convId) {
          fsAdd(`conversations/${convId}/messages`, {
            text: reply.text,
            from: 'bot',
            senderName: BOT_NAME,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }, 900 + Math.random() * 500);
  }

  function open() {
    isOpen = true;
    document.getElementById('cf-box').style.display = 'flex';
    document.getElementById('cf-box').style.flexDirection = 'column';
    document.getElementById('cf-ico-chat').style.display = 'none';
    document.getElementById('cf-ico-close').style.display = 'block';

    // Show greeting on first open
    if (msgs.length === 0) {
      setTimeout(() => {
        showTyping(true);
        setTimeout(() => {
          showTyping(false);
          const first = DEFAULT_FLOW[0];
          const second = DEFAULT_FLOW[1];
          if (first?.type === 'message') addMsg(first.text, 'bot');
          if (second?.type === 'options') {
            setTimeout(() => {
              showTyping(true);
              setTimeout(() => {
                showTyping(false);
                addMsg(second.text, 'bot', second.options);
              }, 700);
            }, 400);
          }
        }, 800);
      }, 300);
    }
  }

  function close() {
    isOpen = false;
    document.getElementById('cf-box').style.display = 'none';
    document.getElementById('cf-ico-chat').style.display = 'block';
    document.getElementById('cf-ico-close').style.display = 'none';
    if (convId) fsPatch(`conversations/${convId}`, { visitorOnline: false });
  }

  function bindEvents() {
    document.getElementById('cf-btn').addEventListener('click', () => isOpen ? close() : open());
    document.getElementById('cf-close').addEventListener('click', close);

    const input = document.getElementById('cf-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = input.value.trim();
        if (v) { input.value = ''; send(v); }
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });

    document.getElementById('cf-send').addEventListener('click', () => {
      const v = input.value.trim();
      if (v) { input.value = ''; send(v); }
    });

    // Mark visitor offline on page leave
    window.addEventListener('beforeunload', () => {
      if (convId) fsPatch(`conversations/${convId}`, { visitorOnline: false });
    });
  }

  // ── Init ────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    bindEvents();
    if (AUTO_OPEN) setTimeout(open, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
