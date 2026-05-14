/**
 * ChatFlow Widget v4 — Polling confiable con IDs únicos
 */
(function () {
  const cfg        = window.ChatFlowConfig || {};
  const PROJECT_ID = cfg.projectId || 'chat-web-4e49d';
  const API_KEY    = cfg.apiKey    || 'AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko';
  const COLOR      = cfg.color     || '#2563EB';
  const BOT_NAME   = cfg.botName   || 'Asistente';
  const POSITION   = cfg.position  || 'right';
  const AUTO_OPEN  = cfg.autoOpen  || false;
  const GREETING   = cfg.greeting  || '¡Hola! ¿En qué puedo ayudarte?';
  const DARK       = '#0F172A';
  const FONT       = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const FS         = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  // ── Firestore REST ────────────────────────────────────────
  function toFS(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string')  fields[k] = { stringValue: v };
      if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
      if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    }
    return { fields };
  }

  function fromFS(doc) {
    const obj = { _id: doc.name?.split('/').pop() };
    for (const [k, fv] of Object.entries(doc.fields || {})) {
      obj[k] = fv.stringValue ?? fv.integerValue ?? fv.booleanValue ?? fv.timestampValue ?? null;
    }
    return obj;
  }

  async function fsAdd(path, data) {
    try {
      const r = await fetch(`${FS}/${path}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toFS(data))
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async function fsPatch(path, data) {
    try {
      const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
      const r = await fetch(`${FS}/${path}?key=${API_KEY}&${mask}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toFS(data))
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async function fsGet(path) {
    try {
      const r = await fetch(`${FS}/${path}?key=${API_KEY}`);
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  // ── Geo ───────────────────────────────────────────────────
  async function getGeo() {
    const apis = [
      async () => {
        const d = await (await fetch('https://ipapi.co/json/')).json();
        if (d.city) return { country: d.country_name, city: d.city, region: d.region, isp: d.org, ip: d.ip };
      },
      async () => {
        const d = await (await fetch('https://ipwho.is/')).json();
        if (d.success) return { country: d.country, city: d.city, region: d.region, isp: d.connection?.isp, ip: d.ip };
      }
    ];
    for (const api of apis) {
      try { const r = await api(); if (r?.city) return r; } catch {}
    }
    return null;
  }

  // ── Bot ───────────────────────────────────────────────────
  function getBotReply(userMsg) {
    const msg = (userMsg || '').toLowerCase().trim();
    if (msg.match(/precio|costo|cuanto|plan|vale/))  return '¿Qué plan te interesa? Tenemos desde $20.000/mes. Te contacto con el equipo de ventas.';
    if (msg.match(/agente|humano|persona|hablar/))   return 'Te conecto con un agente ahora mismo. Un momento...';
    if (msg.match(/hola|buenas|buen|hey/))           return '¡Hola! ¿En qué te puedo ayudar hoy?';
    if (msg.match(/gracias|ok|bien|perfecto/))       return '¡De nada! ¿Hay algo más en que pueda ayudarte?';
    if (msg.match(/chau|adios|hasta|bye/))           return '¡Hasta luego! Que tengas un excelente día 👋';
    if (msg.match(/soporte|problema|error|falla/))   return 'Entendido. Un agente va a revisar tu caso y te responde a la brevedad.';
    if (msg.match(/whatsapp|numero|celular/))        return 'Podés contactarnos por WhatsApp al +54 362 489-7927';
    if (msg === '1' || msg.includes('consultar'))    return '¿Qué plan te interesa? Tenemos desde $20.000/mes.';
    if (msg === '2' || msg.includes('soporte'))      return 'Contame tu consulta y un agente te ayuda a la brevedad.';
    if (msg === '3' || msg.includes('agente'))       return 'Te conecto con un agente ahora mismo. Un momento...';
    return 'Entendido. Un agente revisará tu mensaje y te responderá a la brevedad.';
  }

  // ── Estado ────────────────────────────────────────────────
  let convId    = null;
  let isOpen    = false;
  let msgs      = [];
  let seenIds   = new Set();
  let pollTimer = null;

  // ── Polling ───────────────────────────────────────────────
  async function initSeenIds() {
    // Cargar mensajes existentes y marcarlos como vistos ANTES de empezar el poll
    const data = await fsGet(`conversations/${convId}/messages`);
    if (data?.documents) {
      data.documents.forEach(d => {
        const id = d.name?.split('/').pop();
        if (id) seenIds.add(id);
      });
    }
    console.log('[ChatFlow] Seen IDs initialized:', seenIds.size);
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    console.log('[ChatFlow] Poll started, conv:', convId);

    pollTimer = setInterval(async () => {
      if (!convId) return;
      try {
        const url  = `${FS}/conversations/${convId}/messages?key=${API_KEY}&pageSize=100`;
        const r    = await fetch(url);
        if (!r.ok) return;
        const data = await r.json();

        for (const doc of (data.documents || [])) {
          const id = doc.name?.split('/').pop();
          if (!id || seenIds.has(id)) continue;
          seenIds.add(id);
          const msg = fromFS(doc);
          console.log('[ChatFlow] New:', msg.from, '|', msg.text?.slice(0, 40));
          if (msg.from === 'agent') {
            showTyping(false);
            addMsg(msg.text, 'agent', null, msg.agentName);
          }
        }
      } catch(e) {
        console.warn('[ChatFlow] Poll error:', e.message);
      }
    }, 1500);
  }

  // ── Init conversación ─────────────────────────────────────
  async function initConv() {
    const geo = await getGeo();
    const doc = await fsAdd('conversations', {
      visitorName:   'Visitante',
      visitorOnline: true,
      status:        'open',
      lastMsg:       '',
      unread:        0,
      page:          window.location.href,
      createdAt:     new Date().toISOString(),
      lastAt:        new Date().toISOString(),
      geoCity:       geo?.city    || '',
      geoCountry:    geo?.country || '',
      geoRegion:     geo?.region  || '',
      geoIsp:        geo?.isp     || '',
      geoIp:         geo?.ip      || '',
    });

    if (doc?.name) {
      convId = doc.name.split('/').pop();
      console.log('[ChatFlow] Conv created:', convId);
      await initSeenIds(); // marcar mensajes existentes como vistos
      startPolling();      // recién ahora empezar el poll
    }
  }

  // ── Enviar ────────────────────────────────────────────────
  async function send(text) {
    if (!text?.trim()) return;
    addMsg(text, 'visitor');

    if (!convId) await initConv();
    if (!convId) { console.error('[ChatFlow] No convId'); return; }

    // Guardar mensaje del visitante
    const msgDoc = await fsAdd(`conversations/${convId}/messages`, {
      text,
      from:       'visitor',
      senderName: 'Visitante',
      createdAt:  new Date().toISOString(),
    });

    // Marcar como visto para no mostrarlo de vuelta
    if (msgDoc?.name) seenIds.add(msgDoc.name.split('/').pop());

    await fsPatch(`conversations/${convId}`, {
      lastMsg:       text,
      lastAt:        new Date().toISOString(),
      visitorOnline: true,
      unread:        msgs.filter(m => m.from === 'visitor').length,
    });

    // Respuesta del bot
    showTyping(true);
    setTimeout(async () => {
      showTyping(false);
      const replyText = getBotReply(text);
      addMsg(replyText, 'bot');
      const botDoc = await fsAdd(`conversations/${convId}/messages`, {
        text:       replyText,
        from:       'bot',
        senderName: BOT_NAME,
        createdAt:  new Date().toISOString(),
      });
      if (botDoc?.name) seenIds.add(botDoc.name.split('/').pop());
    }, 900 + Math.random() * 400);
  }

  // ── UI ────────────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #cf-w * { box-sizing:border-box; font-family:${FONT}; }
      #cf-btn { transition:transform 0.2s,box-shadow 0.2s; }
      #cf-btn:hover { transform:scale(1.08); }
      .cf-in { animation:cfIn 0.22s ease; }
      @keyframes cfIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      .cf-opt { transition:all 0.15s; cursor:pointer; }
      .cf-opt:hover { opacity:0.85; transform:translateY(-1px); }
      #cf-msgs::-webkit-scrollbar { width:4px; }
      #cf-msgs::-webkit-scrollbar-thumb { background:#E2E8F0; border-radius:4px; }
      #cf-typing span { animation:cfDot 1.2s infinite; display:inline-block; width:7px; height:7px; border-radius:50%; background:${COLOR}; }
      #cf-typing span:nth-child(2){animation-delay:0.2s}
      #cf-typing span:nth-child(3){animation-delay:0.4s}
      @keyframes cfDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(s);
  }

  function buildUI() {
    const w = document.createElement('div');
    w.id = 'cf-w';
    w.style.cssText = `position:fixed;bottom:20px;${POSITION}:20px;z-index:2147483647;display:flex;flex-direction:column;align-items:${POSITION==='right'?'flex-end':'flex-start'};gap:10px;`;
    w.innerHTML = `
      <div id="cf-box" style="display:none;width:340px;border-radius:18px;box-shadow:0 12px 48px rgba(0,0,0,0.22);overflow:hidden;flex-direction:column;background:#fff;">
        <div style="background:${COLOR};padding:14px 16px;display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style="flex:1;">
            <div style="color:white;font-weight:700;font-size:14px;">${BOT_NAME}</div>
            <div style="color:rgba(255,255,255,0.8);font-size:11px;display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;box-shadow:0 0 4px #4ade80;"></span>En línea
            </div>
          </div>
          <button id="cf-close" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;color:white;font-size:20px;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div id="cf-msgs" style="height:320px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#F8FAFC;"></div>
        <div id="cf-typing" style="display:none;padding:4px 14px 8px;background:#F8FAFC;">
          <div style="background:white;border:1px solid #E2E8F0;border-radius:12px 12px 12px 2px;padding:9px 13px;display:inline-flex;gap:4px;align-items:center;">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div style="padding:10px 12px;border-top:1px solid #E8EEF4;background:white;display:flex;gap:8px;align-items:flex-end;">
          <textarea id="cf-inp" rows="1" placeholder="Escribí tu mensaje..." style="flex:1;border:1.5px solid #E2E8F0;border-radius:12px;padding:9px 13px;font-size:13px;outline:none;resize:none;max-height:80px;line-height:1.4;color:${DARK};background:#F8FAFC;transition:border 0.15s;"></textarea>
          <button id="cf-send" style="width:38px;height:38px;border-radius:12px;background:${COLOR};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
      <button id="cf-btn" style="width:54px;height:54px;border-radius:50%;background:${COLOR};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ${COLOR}66;">
        <svg id="cf-ic1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <svg id="cf-ic2" style="display:none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    document.body.appendChild(w);
  }

  function addMsg(text, from, opts, agentName) {
    const isLeft  = from === 'bot' || from === 'agent';
    const isAgent = from === 'agent';
    const w = document.createElement('div');
    w.className = 'cf-in';
    w.style.cssText = `display:flex;gap:7px;align-items:flex-end;justify-content:${isLeft?'flex-start':'flex-end'};`;

    const bg      = from === 'visitor' ? COLOR : isAgent ? '#ECFDF5' : '#FFFFFF';
    const border  = from === 'visitor' ? 'none' : isAgent ? '1px solid #D1FAE5' : '1px solid #E2E8F0';
    const color   = from === 'visitor' ? '#fff' : DARK;
    const radius  = isLeft ? '14px 14px 14px 2px' : '14px 14px 2px 14px';
    const icColor = isAgent ? '#10B981' : COLOR;
    const icPath  = isAgent
      ? `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`
      : `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`;

    if (isLeft) {
      w.innerHTML = `
        <div style="width:27px;height:27px;border-radius:50%;background:${icColor}18;border:1.5px solid ${icColor}33;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${icColor}" stroke-width="2.5">${icPath}</svg>
        </div>
        <div style="max-width:74%;">
          ${isAgent?`<div style="font-size:10px;color:#10B981;font-weight:700;margin-bottom:3px;">AGENTE${agentName?' · '+agentName:''}</div>`:''}
          <div style="background:${bg};border:${border};border-radius:${radius};padding:9px 13px;font-size:13px;color:${color};line-height:1.55;">${text}</div>
          ${opts?`<div style="display:flex;flex-direction:column;gap:5px;margin-top:7px;">${opts.map(o=>`<button class="cf-opt" onclick="window.__cfSend('${o.replace(/'/g,"\\'")}');this.closest('.cf-in').querySelector('div:last-child').remove();" style="background:${COLOR};color:white;border:none;border-radius:9px;padding:8px 13px;font-size:12px;font-weight:600;text-align:left;">${o}</button>`).join('')}</div>`:''}
        </div>`;
    } else {
      w.innerHTML = `
        <div style="max-width:74%;">
          <div style="background:${bg};border:${border};border-radius:${radius};padding:9px 13px;font-size:13px;color:${color};line-height:1.55;">${text}</div>
        </div>`;
    }

    const el = document.getElementById('cf-msgs');
    el.appendChild(w);
    el.scrollTop = el.scrollHeight;
    msgs.push({ text, from });
  }

  function showTyping(v) {
    const el = document.getElementById('cf-typing');
    if (!el) return;
    el.style.display = v ? 'block' : 'none';
    if (v) { const m = document.getElementById('cf-msgs'); if (m) m.scrollTop = m.scrollHeight; }
  }

  function openChat() {
    isOpen = true;
    const box = document.getElementById('cf-box');
    box.style.display = 'flex'; box.style.flexDirection = 'column';
    document.getElementById('cf-ic1').style.display = 'none';
    document.getElementById('cf-ic2').style.display = 'block';
    if (msgs.length === 0) {
      setTimeout(() => {
        showTyping(true);
        setTimeout(() => {
          showTyping(false);
          addMsg(GREETING, 'bot');
          setTimeout(() => {
            showTyping(true);
            setTimeout(() => {
              showTyping(false);
              addMsg('¿En qué te puedo ayudar?', 'bot', ['Consultar precios', 'Soporte técnico', 'Hablar con un agente']);
            }, 700);
          }, 500);
        }, 900);
      }, 300);
    }
    setTimeout(() => document.getElementById('cf-inp')?.focus(), 400);
  }

  function closeChat() {
    isOpen = false;
    document.getElementById('cf-box').style.display = 'none';
    document.getElementById('cf-ic1').style.display = 'block';
    document.getElementById('cf-ic2').style.display = 'none';
    if (convId) fsPatch(`conversations/${convId}`, { visitorOnline: false });
  }

  function bindEvents() {
    document.getElementById('cf-btn').onclick   = () => isOpen ? closeChat() : openChat();
    document.getElementById('cf-close').onclick = closeChat;

    const inp  = document.getElementById('cf-inp');
    const snd  = document.getElementById('cf-send');

    inp.onfocus = () => inp.style.borderColor = COLOR;
    inp.onblur  = () => inp.style.borderColor = '#E2E8F0';
    inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 80) + 'px'; };
    inp.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = inp.value.trim();
        if (v) { inp.value = ''; inp.style.height = 'auto'; send(v); }
      }
    };
    snd.onclick = () => {
      const v = inp.value.trim();
      if (v) { inp.value = ''; inp.style.height = 'auto'; send(v); }
    };

    window.__cfSend = send;
    window.addEventListener('beforeunload', () => {
      if (pollTimer) clearInterval(pollTimer);
      if (convId) fsPatch(`conversations/${convId}`, { visitorOnline: false });
    });
  }

  function init() {
    injectStyles();
    buildUI();
    bindEvents();
    if (AUTO_OPEN) setTimeout(openChat, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
