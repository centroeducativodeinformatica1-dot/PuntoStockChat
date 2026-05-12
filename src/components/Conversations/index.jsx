import { useState, useRef, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, where
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { Icon } from '../Icon'
import { StatusDot } from '../AgentStatus'
import { geoLabel, flagEmoji } from '../../lib/geo'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const C = {
  bg:'#0B0A14', card:'#13111F', surface:'#1C1A2E', border:'rgba(255,255,255,0.06)',
  primary:'#6C47FF', accent:'#00D9B5', text:'#EDEAF8', muted:'#7A7690', faint:'#45425A',
  danger:'#FF4D4D', warning:'#FFB020', success:'#00D9B5',
}

const FILTERS = [
  { id:'all',    label:'Todos'    },
  { id:'open',   label:'Abiertos' },
  { id:'mine',   label:'Míos'    },
  { id:'closed', label:'Cerrados' },
]

function timeAgo(ts) {
  if (!ts) return ''
  try {
    return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix:true, locale:es })
  } catch { return '' }
}

function Avatar({ name='?', photo, size=36 }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const colors = ['#6C47FF','#00D9B5','#FF8C47','#FF4D4D','#4DB8FF','#C47AFF']
  const color  = colors[name.charCodeAt(0) % colors.length]
  if (photo) return <img src={photo} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color+'22', border:`1.5px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', color, fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  )
}

// ── Conversation List Item ────────────────────────────────────────────────────
function ConvItem({ conv, active, onClick }) {
  return (
    <div onClick={onClick}
      style={{ padding:'12px 14px', cursor:'pointer', background:active?C.surface:'transparent', borderLeft:active?`3px solid ${C.primary}`:'3px solid transparent', transition:'all 0.12s', display:'flex', gap:10, alignItems:'flex-start' }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <Avatar name={conv.visitorName || 'Visitante'} size={38}/>
        <div style={{ position:'absolute', bottom:0, right:0 }}>
          <StatusDot status={conv.visitorOnline?'online':'offline'} size={10}/>
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
          <div style={{ color:C.text, fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>
            {conv.visitorName || 'Visitante'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            {conv.unread > 0 && <div style={{ background:C.danger, color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px', minWidth:18, textAlign:'center' }}>{conv.unread}</div>}
            <span style={{ color:C.faint, fontSize:10, whiteSpace:'nowrap' }}>{timeAgo(conv.lastAt)}</span>
          </div>
        </div>
        <div style={{ color:C.muted, fontSize:11.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {conv.lastMsg || 'Sin mensajes'}
        </div>
        {conv.geo && (
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
            <span style={{ fontSize:11 }}>{flagEmoji(conv.geo.country)}</span>
            <span style={{ color:C.faint, fontSize:10 }}>{conv.geo.city}, {conv.geo.country}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, agentDoc }) {
  const isAgent   = msg.from === 'agent'
  const isSystem  = msg.from === 'system'
  const isSelf    = isAgent && msg.agentId === agentDoc?.uid

  if (isSystem) return (
    <div style={{ textAlign:'center', color:C.faint, fontSize:11, padding:'4px 0' }}>{msg.text}</div>
  )

  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-end', justifyContent:isAgent?'flex-end':'flex-start', marginBottom:2 }}>
      {!isAgent && <Avatar name={msg.senderName || 'Visitante'} size={28}/>}
      <div style={{ maxWidth:'68%' }}>
        {!isAgent && <div style={{ color:C.muted, fontSize:10, marginBottom:3, paddingLeft:2 }}>{msg.senderName || 'Visitante'}</div>}
        <div style={{ background:isAgent?(isSelf?C.primary:'#2A2840'):'#1C1A2E', borderRadius:isAgent?'14px 14px 2px 14px':'14px 14px 14px 2px', padding:'9px 14px', fontSize:13, color:isAgent&&isSelf?'#fff':C.text, lineHeight:1.5, wordBreak:'break-word' }}>
          {msg.text}
        </div>
        <div style={{ color:C.faint, fontSize:9.5, marginTop:3, textAlign:isAgent?'right':'left', paddingLeft:isAgent?0:2 }}>
          {isAgent && <span style={{ marginRight:4 }}>{msg.agentName}</span>}
          {timeAgo(msg.createdAt)}
        </div>
      </div>
      {isAgent && isSelf && <Avatar name={agentDoc?.name || 'Yo'} photo={agentDoc?.photoURL} size={28}/>}
    </div>
  )
}

// ── Visitor Info Panel ────────────────────────────────────────────────────────
function VisitorPanel({ conv }) {
  if (!conv) return null
  const geo = conv.geo
  return (
    <div style={{ width:240, background:C.card, borderLeft:`1px solid ${C.border}`, overflowY:'auto', flexShrink:0 }}>
      <div style={{ padding:'16px 16px 12px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ textAlign:'center', marginBottom:12 }}>
          <Avatar name={conv.visitorName || 'Visitante'} size={52}/>
          <div style={{ color:C.text, fontWeight:700, fontSize:14, marginTop:8 }}>{conv.visitorName || 'Visitante'}</div>
          <div style={{ color:C.muted, fontSize:11 }}>{conv.visitorEmail || 'Sin email'}</div>
        </div>
        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
          <StatusDot status={conv.visitorOnline?'online':'offline'}/>
          <span style={{ color:conv.visitorOnline?'#00E676':C.faint, fontSize:11 }}>{conv.visitorOnline?'En línea':'Desconectado'}</span>
        </div>
      </div>

      {/* Geo info */}
      {geo && (
        <Section title="Ubicación">
          <InfoRow icon="mapPin" label="Ciudad" value={geo.city}/>
          <InfoRow icon="globe"  label="País"   value={`${flagEmoji(geo.country)} ${geo.country}`}/>
          <InfoRow icon="tag"    label="Región" value={geo.region}/>
          {geo.zip && <InfoRow icon="tag" label="CP" value={geo.zip}/>}
          <InfoRow icon="wifi"   label="ISP"    value={geo.isp}/>
        </Section>
      )}

      <Section title="Sesión">
        <InfoRow icon="globe"  label="IP"      value={geo?.ip || 'N/A'}/>
        <InfoRow icon="clock"  label="Inicio"  value={timeAgo(conv.createdAt)}/>
        <InfoRow icon="eye"    label="Página"  value={conv.page || 'N/A'}/>
      </Section>

      {conv.assignedTo && (
        <Section title="Asignado a">
          <InfoRow icon="user" label="Agente" value={conv.assignedToName || conv.assignedTo}/>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ color:'#45425A', fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
      <Icon n={icon} size={12} color="#45425A" style={{ marginTop:1, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:'#45425A', fontSize:9.5 }}>{label}</div>
        <div style={{ color:'#7A7690', fontSize:11, wordBreak:'break-all' }}>{value || '—'}</div>
      </div>
    </div>
  )
}

// ── Main Conversations Page ───────────────────────────────────────────────────
export default function ConversationsPage() {
  const user        = useStore(s => s.user)
  const agentDoc    = useStore(s => s.agentDoc)
  const conversations     = useStore(s => s.conversations)
  const setConversations  = useStore(s => s.setConversations)
  const activeId          = useStore(s => s.activeConversationId)
  const setActiveId       = useStore(s => s.setActiveConversation)

  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [showInfo, setShowInfo]   = useState(true)
  const bottomRef = useRef()

  const activeConv = conversations.find(c => c.id === activeId)

  // ── Load conversations ──
  useEffect(() => {
    const q = query(collection(db, 'conversations'), orderBy('lastAt', 'desc'))
    return onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    })
  }, [])

  // ── Load messages for active conversation ──
  useEffect(() => {
    if (!activeId) return
    const q = query(collection(db, 'conversations', activeId, 'messages'), orderBy('createdAt'))
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    })
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  // Mark as read when opened
  useEffect(() => {
    if (!activeId) return
    updateDoc(doc(db, 'conversations', activeId), { unread:0 }).catch(()=>{})
  }, [activeId, messages.length])

  const sendMessage = async () => {
    if (!input.trim() || !activeId) return
    const text = input.trim()
    setInput('')
    await addDoc(collection(db, 'conversations', activeId, 'messages'), {
      text, from:'agent', agentId:user.uid, agentName:agentDoc?.name || user.displayName,
      createdAt:serverTimestamp(),
    })
    await updateDoc(doc(db, 'conversations', activeId), {
      lastMsg:text, lastAt:serverTimestamp(), status:'open',
      assignedTo:user.uid, assignedToName:agentDoc?.name || user.displayName,
    })
  }

  const closeConversation = async () => {
    if (!activeId) return
    await updateDoc(doc(db, 'conversations', activeId), { status:'closed' })
  }

  const filtered = conversations.filter(c => {
    if (filter==='open'   && c.status==='closed') return false
    if (filter==='closed' && c.status!=='closed') return false
    if (filter==='mine'   && c.assignedTo!==user?.uid) return false
    if (search && !((c.visitorName||'').toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  return (
    <div style={{ display:'flex', height:'100%', background:C.bg }}>

      {/* ── Conversation list ── */}
      <div style={{ width:280, background:C.card, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
        {/* Search */}
        <div style={{ padding:'12px 12px 8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 10px' }}>
            <Icon n="search" size={14} color={C.faint}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conversación..."
              style={{ background:'none', border:'none', color:C.text, fontSize:12, outline:'none', flex:1, fontFamily:'inherit' }}/>
          </div>
        </div>
        {/* Filters */}
        <div style={{ display:'flex', gap:2, padding:'0 12px 8px', overflowX:'auto' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{ background:filter===f.id?C.primary:'transparent', border:`1px solid ${filter===f.id?C.primary:C.border}`, borderRadius:8, padding:'4px 10px', color:filter===f.id?'#fff':C.muted, fontSize:11, cursor:'pointer', fontWeight:filter===f.id?700:400, whiteSpace:'nowrap' }}>
              {f.label}
            </button>
          ))}
        </div>
        {/* List */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', color:C.faint, fontSize:12, marginTop:40 }}>
              <Icon n="inbox" size={28} color={C.faint} style={{ margin:'0 auto 10px' }}/>
              Sin conversaciones
            </div>
          )}
          {filtered.map(c => (
            <ConvItem key={c.id} conv={c} active={c.id===activeId} onClick={()=>setActiveId(c.id)}/>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {/* Chat header */}
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, background:C.card, flexShrink:0 }}>
            <Avatar name={activeConv.visitorName||'Visitante'} size={34}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{activeConv.visitorName||'Visitante'}</span>
                <StatusDot status={activeConv.visitorOnline?'online':'offline'} size={8}/>
              </div>
              {activeConv.geo && (
                <div style={{ color:C.faint, fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                  <Icon n="mapPin" size={10} color={C.faint}/>
                  {flagEmoji(activeConv.geo.country)} {geoLabel(activeConv.geo)}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>setShowInfo(s=>!s)}
                style={{ background:showInfo?'rgba(108,71,255,0.15)':'transparent', border:`1px solid ${showInfo?C.primary:C.border}`, borderRadius:8, padding:'5px 10px', color:showInfo?C.primary:C.muted, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                <Icon n="eye" size={13} color={showInfo?C.primary:C.muted}/> Info
              </button>
              {activeConv.status !== 'closed' && (
                <button onClick={closeConversation}
                  style={{ background:'rgba(0,217,181,0.1)', border:`1px solid ${C.accent}44`, borderRadius:8, padding:'5px 10px', color:C.accent, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600 }}>
                  <Icon n="check" size={13} color={C.accent}/> Resolver
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.map(m => <Bubble key={m.id} msg={m} agentDoc={agentDoc}/>)}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
            {activeConv.status==='closed' && (
              <div style={{ textAlign:'center', color:C.faint, fontSize:12, marginBottom:8 }}>
                Esta conversación está cerrada.
                <button onClick={()=>updateDoc(doc(db,'conversations',activeId),{status:'open'})} style={{ marginLeft:8, color:C.primary, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>Reabrir</button>
              </div>
            )}
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, display:'flex', alignItems:'center', gap:6, padding:'8px 12px' }}>
                <textarea
                  value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } }}
                  placeholder={activeConv.status==='closed'?'Conversación cerrada...':'Escribí una respuesta... (Enter para enviar)'}
                  disabled={activeConv.status==='closed'}
                  style={{ flex:1, background:'none', border:'none', color:C.text, fontSize:13, outline:'none', resize:'none', minHeight:20, maxHeight:100, fontFamily:'inherit', lineHeight:1.5 }} rows={1}/>
                <button style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', padding:0 }}>
                  <Icon n="emoji" size={18} color={C.faint}/>
                </button>
              </div>
              <button onClick={sendMessage} disabled={!input.trim()||activeConv.status==='closed'}
                style={{ width:40, height:40, borderRadius:12, background:input.trim()&&activeConv.status!=='closed'?C.primary:'#1C1A2E', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s', flexShrink:0 }}>
                <Icon n="send" size={16} color={input.trim()&&activeConv.status!=='closed'?'#fff':C.faint}/>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <Icon n="messages" size={40} color={C.faint}/>
          <div style={{ color:C.muted, fontSize:14 }}>Seleccioná una conversación</div>
          <div style={{ color:C.faint, fontSize:12 }}>O esperá a que un cliente inicie un chat</div>
        </div>
      )}

      {/* ── Visitor info panel ── */}
      {showInfo && activeConv && <VisitorPanel conv={activeConv}/>}
    </div>
  )
}
