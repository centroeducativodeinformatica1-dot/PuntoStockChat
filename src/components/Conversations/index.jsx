import { useState, useRef, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'
import { StatusDot } from '../AgentStatus'
import { geoLabel, flagEmoji } from '../../lib/geo'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function timeAgo(ts) {
  if (!ts) return ''
  try { return formatDistanceToNow(ts.toDate?ts.toDate():new Date(ts),{addSuffix:true,locale:es}) } catch { return '' }
}

function Avatar({ name='?', photo, size=36, T }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const colors = ['#2563EB','#0EA5E9','#8B5CF6','#10B981','#F59E0B','#EF4444']
  const color  = colors[name.charCodeAt(0)%colors.length]
  if (photo) return <img src={photo} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}18`, border:`1.5px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', color, fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  )
}

const FILTERS = [{id:'all',label:'Todos'},{id:'open',label:'Abiertos'},{id:'mine',label:'Míos'},{id:'closed',label:'Cerrados'}]

export default function ConversationsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const conversations    = useStore(s => s.conversations)
  const setConversations = useStore(s => s.setConversations)
  const activeId         = useStore(s => s.activeConversationId)
  const setActiveId      = useStore(s => s.setActiveConversation)
  const { mode } = useTheme()
  const T = getTheme(mode)

  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [showInfo, setShowInfo] = useState(true)
  const bottomRef = useRef()
  const activeConv = conversations.find(c => c.id === activeId)

  useEffect(() => {
    const q = query(collection(db,'conversations'), orderBy('lastAt','desc'))
    return onSnapshot(q, snap => setConversations(snap.docs.map(d=>({id:d.id,...d.data()}))))
  }, [])

  useEffect(() => {
    if (!activeId) return
    const q = query(collection(db,'conversations',activeId,'messages'), orderBy('createdAt'))
    return onSnapshot(q, snap => setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))))
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  useEffect(() => {
    if (!activeId) return
    updateDoc(doc(db,'conversations',activeId),{unread:0}).catch(()=>{})
  }, [activeId, messages.length])

  const sendMessage = async () => {
    if (!input.trim()||!activeId) return
    const text = input.trim(); setInput('')
    await addDoc(collection(db,'conversations',activeId,'messages'),{
      text, from:'agent', agentId:user.uid, agentName:agentDoc?.name||user.displayName, createdAt:serverTimestamp(),
    })
    await updateDoc(doc(db,'conversations',activeId),{
      lastMsg:text, lastAt:serverTimestamp(), status:'open',
      assignedTo:user.uid, assignedToName:agentDoc?.name||user.displayName,
    })
  }

  const filtered = conversations.filter(c => {
    if (filter==='open'   && c.status==='closed') return false
    if (filter==='closed' && c.status!=='closed') return false
    if (filter==='mine'   && c.assignedTo!==user?.uid) return false
    if (search && !(c.visitorName||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ display:'flex', height:'100%', background:T.bg }}>
      {/* List */}
      <div style={{ width:290, background:T.bgCard, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 12px 8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:10, padding:'7px 10px' }}>
            <Icon n="search" size={14} color={T.textFaint}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
              style={{ background:'none', border:'none', color:T.text, fontSize:13, outline:'none', flex:1, fontFamily:'inherit' }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, padding:'0 12px 10px', overflowX:'auto' }}>
          {FILTERS.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{ background:filter===f.id?T.primary:'transparent', border:`1px solid ${filter===f.id?T.primary:T.border}`, borderRadius:20, padding:'3px 10px', color:filter===f.id?'#fff':T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:filter===f.id?600:400, whiteSpace:'nowrap', transition:'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length===0 && (
            <div style={{ textAlign:'center', color:T.textFaint, fontSize:12.5, marginTop:40 }}>
              <Icon n="inbox" size={28} color={T.textFaint} style={{ margin:'0 auto 10px' }}/>
              Sin conversaciones
            </div>
          )}
          {filtered.map(c=>(
            <div key={c.id} onClick={()=>setActiveId(c.id)}
              style={{ padding:'11px 14px', cursor:'pointer', background:activeId===c.id?T.primaryLight:'transparent', borderLeft:activeId===c.id?`3px solid ${T.primary}`:'3px solid transparent', transition:'all 0.12s', display:'flex', gap:10 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <Avatar name={c.visitorName||'Visitante'} size={38} T={T}/>
                <div style={{ position:'absolute', bottom:0, right:0 }}><StatusDot status={c.visitorOnline?'online':'offline'} size={10}/></div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <span style={{ color:T.text, fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>{c.visitorName||'Visitante'}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    {c.unread>0 && <div style={{ background:T.danger, color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 5px' }}>{c.unread}</div>}
                    <span style={{ color:T.textFaint, fontSize:10 }}>{timeAgo(c.lastAt)}</span>
                  </div>
                </div>
                <div style={{ color:T.textMuted, fontSize:11.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.lastMsg||'Sin mensajes'}</div>
                {(c.geoCity||c.geo?.city) && <div style={{ color:T.textFaint, fontSize:10.5, marginTop:2 }}>{flagEmoji(c.geoCountry||c.geo?.country)} {c.geoCity||c.geo?.city}{c.geoCountry ? ', ' + c.geoCountry : ''}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      {activeConv ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <div style={{ padding:'10px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, background:T.bgCard, flexShrink:0, boxShadow:T.shadow }}>
            <Avatar name={activeConv.visitorName||'Visitante'} size={34} T={T}/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>{activeConv.visitorName||'Visitante'}</span>
                <StatusDot status={activeConv.visitorOnline?'online':'offline'} size={8}/>
              </div>
              {(activeConv.geoCity||activeConv.geo?.city) && <div style={{ color:T.textFaint, fontSize:11 }}>{flagEmoji(activeConv.geoCountry||activeConv.geo?.country)} {activeConv.geoCity||activeConv.geo?.city}{activeConv.geoCountry ? ', ' + activeConv.geoCountry : ''}</div>}
            </div>
            <button onClick={()=>setShowInfo(s=>!s)}
              style={{ background:showInfo?T.primaryLight:'transparent', border:`1px solid ${showInfo?T.primary+'44':T.border}`, borderRadius:8, padding:'5px 10px', color:showInfo?T.primary:T.textMuted, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
              <Icon n="eye" size={13} color={showInfo?T.primary:T.textMuted}/> Info
            </button>
            {activeConv.status!=='closed' && (
              <button onClick={()=>updateDoc(doc(db,'conversations',activeId),{status:'closed'})}
                style={{ background:`${T.success}12`, border:`1px solid ${T.success}44`, borderRadius:8, padding:'5px 10px', color:T.success, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
                <Icon n="check" size={13} color={T.success}/> Resolver
              </button>
            )}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8, background:T.bg }}>
            {messages.map(m=>{
              const isAgent = m.from==='agent'
              const isSelf  = isAgent && m.agentId===agentDoc?.uid
              if (m.from==='system') return <div key={m.id} style={{ textAlign:'center', color:T.textFaint, fontSize:11 }}>{m.text}</div>
              return (
                <div key={m.id} style={{ display:'flex', gap:8, alignItems:'flex-end', justifyContent:isAgent?'flex-end':'flex-start' }}>
                  {!isAgent && <Avatar name={m.senderName||'Visitante'} size={28} T={T}/>}
                  <div style={{ maxWidth:'68%' }}>
                    {!isAgent && <div style={{ color:T.textFaint, fontSize:10, marginBottom:3 }}>{m.senderName||'Visitante'}</div>}
                    <div style={{ background:isAgent?(isSelf?T.primary:T.bgSurface):T.bgCard, border:`1px solid ${isAgent?(isSelf?'transparent':T.border):T.border}`, borderRadius:isAgent?'14px 14px 2px 14px':'14px 14px 14px 2px', padding:'9px 14px', fontSize:13, color:isSelf?'#fff':T.text, lineHeight:1.5, boxShadow:T.shadow }}>
                      {m.text}
                    </div>
                    <div style={{ color:T.textFaint, fontSize:9.5, marginTop:3, textAlign:isAgent?'right':'left' }}>
                      {isAgent && <span style={{ marginRight:4 }}>{m.agentName}</span>}
                      {timeAgo(m.createdAt)}
                    </div>
                  </div>
                  {isAgent&&isSelf && <Avatar name={agentDoc?.name||'Yo'} photo={agentDoc?.photoURL} size={28} T={T}/>}
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          <div style={{ padding:'10px 16px', borderTop:`1px solid ${T.border}`, background:T.bgCard, flexShrink:0 }}>
            {activeConv.status==='closed' && (
              <div style={{ textAlign:'center', color:T.textFaint, fontSize:12, marginBottom:8 }}>
                Conversación cerrada.
                <button onClick={()=>updateDoc(doc(db,'conversations',activeId),{status:'open'})} style={{ marginLeft:8, color:T.primary, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>Reabrir</button>
              </div>
            )}
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ flex:1, background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:12, padding:'8px 12px', display:'flex', alignItems:'center', gap:6 }}>
                <textarea value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}
                  disabled={activeConv.status==='closed'}
                  placeholder={activeConv.status==='closed'?'Conversación cerrada...':'Escribí una respuesta... (Enter para enviar)'}
                  style={{ flex:1, background:'none', border:'none', color:T.text, fontSize:13, outline:'none', resize:'none', minHeight:20, maxHeight:100, fontFamily:'inherit', lineHeight:1.5 }} rows={1}/>
              </div>
              <button onClick={sendMessage} disabled={!input.trim()||activeConv.status==='closed'}
                style={{ width:40, height:40, borderRadius:12, background:input.trim()&&activeConv.status!=='closed'?T.primary:T.bgSurface, border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                <Icon n="send" size={15} color={input.trim()&&activeConv.status!=='closed'?'#fff':T.textFaint}/>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:T.bg }}>
          <div style={{ width:64, height:64, borderRadius:20, background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon n="messages" size={28} color={T.primary}/>
          </div>
          <div style={{ color:T.text, fontSize:15, fontWeight:600 }}>Seleccioná una conversación</div>
          <div style={{ color:T.textFaint, fontSize:13 }}>O esperá a que un cliente inicie un chat</div>
        </div>
      )}

      {/* Visitor info */}
      {showInfo && activeConv && (
        <div style={{ width:240, background:T.bgCard, borderLeft:`1px solid ${T.border}`, overflowY:'auto', flexShrink:0 }}>
          <div style={{ padding:'16px', borderBottom:`1px solid ${T.border}`, textAlign:'center' }}>
            <Avatar name={activeConv.visitorName||'Visitante'} size={52} T={T}/>
            <div style={{ color:T.text, fontWeight:700, fontSize:14, marginTop:8 }}>{activeConv.visitorName||'Visitante'}</div>
            <div style={{ color:T.textMuted, fontSize:12 }}>{activeConv.visitorEmail||'Sin email'}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginTop:6 }}>
              <StatusDot status={activeConv.visitorOnline?'online':'offline'} size={8}/>
              <span style={{ color:T.textFaint, fontSize:11 }}>{activeConv.visitorOnline?'En línea':'Desconectado'}</span>
            </div>
          </div>

          {/* Geo — soporta ambos formatos: campos separados (geoCity) y objeto (geo.city) */}
          {(() => {
            const city    = activeConv.geoCity    || activeConv.geo?.city
            const country = activeConv.geoCountry || activeConv.geo?.country
            const region  = activeConv.geoRegion  || activeConv.geo?.region
            const isp     = activeConv.geoIsp     || activeConv.geo?.isp
            const ip      = activeConv.geoIp      || activeConv.geo?.ip
            if (!city && !country) return null
            return (
              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ color:T.textFaint, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Ubicación</div>
                {[
                  ['mapPin', 'Ciudad',  city],
                  ['globe',  'País',    country ? `${flagEmoji(country)} ${country}` : null],
                  ['tag',    'Región',  region],
                  ['wifi',   'ISP',     isp],
                ].filter(([,,v]) => v).map(([ic,lb,val]) => (
                  <div key={lb} style={{ display:'flex', gap:8, marginBottom:7 }}>
                    <Icon n={ic} size={12} color={T.textFaint} style={{ marginTop:1 }}/>
                    <div>
                      <div style={{ color:T.textFaint, fontSize:9.5 }}>{lb}</div>
                      <div style={{ color:T.textMuted, fontSize:11 }}>{val||'—'}</div>
                    </div>
                  </div>
                ))}
                {ip && (
                  <div style={{ display:'flex', gap:8, marginBottom:7 }}>
                    <Icon n="globe" size={12} color={T.textFaint} style={{ marginTop:1 }}/>
                    <div>
                      <div style={{ color:T.textFaint, fontSize:9.5 }}>IP</div>
                      <div style={{ color:T.textMuted, fontSize:11, fontFamily:'monospace' }}>{ip}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div style={{ padding:'12px 14px' }}>
            <div style={{ color:T.textFaint, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Sesión</div>
            {[
              ['clock', 'Inicio', timeAgo(activeConv.createdAt)],
              ['eye',   'Página', activeConv.page],
            ].map(([ic,lb,val]) => (
              <div key={lb} style={{ display:'flex', gap:8, marginBottom:7 }}>
                <Icon n={ic} size={12} color={T.textFaint} style={{ marginTop:1 }}/>
                <div>
                  <div style={{ color:T.textFaint, fontSize:9.5 }}>{lb}</div>
                  <div style={{ color:T.textMuted, fontSize:11, wordBreak:'break-all' }}>{val||'—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
