import { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, addDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'
import { StatusDot } from '../AgentStatus'
import { OWNER_EMAIL } from '../Auth'

const ROLES = { admin:'Administrador', agent:'Agente' }
const STATUS_COLORS = { online:'#10B981', break:'#F59E0B', offline:'#EF4444' }
const STATUS_LABELS = { online:'Disponible', break:'En descanso', offline:'No disponible' }

// ← Componente separado para cada agente (soluciona el useState dentro de map)
function AgentRow({ agent, user, isAdmin, onToggle, onDelete, onRoleChange, T }) {
  const [confirm, setConfirm] = useState(false)
  const isMe    = agent.uid === user?.uid
  const isOwner = agent.email === OWNER_EMAIL

  return (
    <div style={{ background:T.bgCard, borderRadius:12, padding:'16px 18px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        {agent.photoURL
          ? <img src={agent.photoURL} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover' }}/>
          : <div style={{ width:44, height:44, borderRadius:'50%', background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', color:T.primary, fontSize:16, fontWeight:700 }}>{(agent.name||'?').charAt(0).toUpperCase()}</div>
        }
        <div style={{ position:'absolute', bottom:0, right:0 }}><StatusDot status={agent.status||'offline'} size={12}/></div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>{agent.name}</span>
          {isMe    && <span style={{ background:T.primaryLight, color:T.primary, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Vos</span>}
          {isOwner && <span style={{ background:`${T.warning}18`, color:T.warning, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Owner</span>}
        </div>
        <div style={{ color:T.textMuted, fontSize:12 }}>{agent.email}</div>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:STATUS_COLORS[agent.status]||T.textFaint }}/>
          <span style={{ color:T.textFaint, fontSize:11 }}>{STATUS_LABELS[agent.status]||'Sin estado'}</span>
        </div>
      </div>
      <div style={{ background:agent.role==='admin'?`${T.warning}18`:T.primaryLight, border:`1px solid ${agent.role==='admin'?T.warning:T.primary}33`, borderRadius:8, padding:'4px 10px', color:agent.role==='admin'?T.warning:T.primary, fontSize:11, fontWeight:700, cursor:isOwner||isMe?'default':'pointer' }}
        onClick={()=>{ if(!isOwner&&!isMe&&isAdmin) onRoleChange(agent) }}>
        {ROLES[agent.role]||'Agente'}
      </div>
      {!isOwner && !isMe && isAdmin && (
        <div onClick={()=>onToggle(agent)}
          style={{ width:36, height:20, borderRadius:10, background:agent.active?T.success:'#e2e8f0', cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:agent.active?18:3, transition:'left 0.2s' }}/>
        </div>
      )}
      {!isOwner && !isMe && isAdmin && (
        confirm
          ? <div style={{ display:'flex', gap:4 }}>
              <button onClick={()=>onDelete(agent)} style={{ background:`${T.danger}12`, border:`1px solid ${T.danger}33`, borderRadius:8, padding:'4px 10px', color:T.danger, fontSize:11, cursor:'pointer', fontWeight:700 }}>Confirmar</button>
              <button onClick={()=>setConfirm(false)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:8, padding:'4px 8px', color:T.textMuted, fontSize:11, cursor:'pointer' }}>No</button>
            </div>
          : <button onClick={()=>setConfirm(true)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 8px', color:T.textFaint, cursor:'pointer', display:'flex', alignItems:'center' }}>
              <Icon n="trash" size={14} color={T.textFaint}/>
            </button>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const { mode }  = useTheme()
  const T = getTheme(mode)
  const [agents,      setAgents]      = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName,  setInviteName]  = useState('')
  const [inviteRole,  setInviteRole]  = useState('agent')
  const [showInvite,  setShowInvite]  = useState(false)
  const [loading,     setLoading]     = useState(false)
  const isAdmin = agentDoc?.role === 'admin'

  useEffect(() => {
    return onSnapshot(query(collection(db,'agents'), orderBy('createdAt')), snap =>
      setAgents(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    )
  }, [])

  const handleToggle     = async (a) => { await updateDoc(doc(db,'agents',a.id),{active:!a.active}); showToast(a.active?'Agente desactivado':'Agente activado') }
  const handleDelete     = async (a) => { await deleteDoc(doc(db,'agents',a.id)); showToast('Agente eliminado','error') }
  const handleRoleChange = async (a) => { const r=a.role==='admin'?'agent':'admin'; await updateDoc(doc(db,'agents',a.id),{role:r}); showToast(`Rol cambiado a ${ROLES[r]}`) }
  const handleInvite     = async () => {
    if (!inviteEmail.trim()) return
    setLoading(true)
    try {
      await addDoc(collection(db,'invites'),{
        email: inviteEmail.trim().toLowerCase(),
        name:  inviteName.trim() || inviteEmail.split('@')[0],
        role:  inviteRole,
        invitedBy: user.uid,
        invitedAt: Date.now(),
        used: false
      })
      showToast(`Invitación guardada para ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setShowInvite(false)
    } catch { showToast('Error al invitar','error') }
    setLoading(false)
  }

  const iSt = { width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, background:T.bg }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:2 }}>Equipo</div>
          <div style={{ color:T.textMuted, fontSize:12.5 }}>{agents.filter(a=>a.active).length} activos · {agents.filter(a=>a.status==='online').length} en línea</div>
        </div>
        {isAdmin && (
          <button onClick={()=>setShowInvite(s=>!s)}
            style={{ background:T.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
            <Icon n="userPlus" size={15} color="#fff"/> Invitar agente
          </button>
        )}
      </div>

      {showInvite && (
        <div style={{ background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.primary}33`, marginBottom:20 }}>
          <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:14 }}>Invitar nuevo agente</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ color:T.textFaint, fontSize:11, display:'block', marginBottom:5 }}>Email de Google *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={iSt} placeholder="agente@gmail.com"/>
            </div>
            <div>
              <label style={{ color:T.textFaint, fontSize:11, display:'block', marginBottom:5 }}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)} style={iSt} placeholder="Nombre del agente"/>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {Object.entries(ROLES).map(([r,l]) => (
              <button key={r} onClick={()=>setInviteRole(r)}
                style={{ flex:1, padding:'9px', borderRadius:10, background:inviteRole===r?T.primaryLight:'transparent', border:`1px solid ${inviteRole===r?T.primary:T.border}`, color:inviteRole===r?T.primary:T.textMuted, fontSize:12.5, fontWeight:inviteRole===r?700:400, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleInvite} disabled={loading||!inviteEmail.trim()}
              style={{ flex:1, background:T.primary, border:'none', borderRadius:10, padding:'10px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:loading||!inviteEmail.trim()?0.6:1 }}>
              {loading ? 'Guardando...' : 'Guardar invitación'}
            </button>
            <button onClick={()=>setShowInvite(false)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 16px', color:T.textMuted, fontSize:13, cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {agents.map(agent => (
          <AgentRow
            key={agent.id}
            agent={agent}
            user={user}
            isAdmin={isAdmin}
            T={T}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onRoleChange={handleRoleChange}
          />
        ))}
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const { mode }  = useTheme()
  const T = getTheme(mode)
  const [agents, setAgents] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName,  setInviteName]  = useState('')
  const [inviteRole,  setInviteRole]  = useState('agent')
  const [showInvite,  setShowInvite]  = useState(false)
  const [loading, setLoading] = useState(false)
  const isAdmin = agentDoc?.role === 'admin'

  useEffect(() => {
    return onSnapshot(query(collection(db,'agents'),orderBy('createdAt')), snap =>
      setAgents(snap.docs.map(d=>({id:d.id,...d.data()})))
    )
  }, [])

  const handleToggle = async (agent) => { await updateDoc(doc(db,'agents',agent.id),{active:!agent.active}); showToast(agent.active?'Agente desactivado':'Agente activado') }
  const handleDelete = async (agent) => { await deleteDoc(doc(db,'agents',agent.id)); showToast('Agente eliminado','error') }
  const handleRoleChange = async (agent) => { const r=agent.role==='admin'?'agent':'admin'; await updateDoc(doc(db,'agents',agent.id),{role:r}); showToast(`Rol cambiado a ${ROLES[r]}`) }
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setLoading(true)
    try {
      await addDoc(collection(db,'invites'),{ email:inviteEmail.trim().toLowerCase(), name:inviteName.trim()||inviteEmail.split('@')[0], role:inviteRole, invitedBy:user.uid, invitedAt:Date.now(), used:false })
      showToast(`Invitación guardada para ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setShowInvite(false)
    } catch { showToast('Error al invitar','error') }
    setLoading(false)
  }

  const iSt = { width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, background:T.bg }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:2 }}>Equipo</div>
          <div style={{ color:T.textMuted, fontSize:12.5 }}>{agents.filter(a=>a.active).length} activos · {agents.filter(a=>a.status==='online').length} en línea</div>
        </div>
        {isAdmin && (
          <button onClick={()=>setShowInvite(s=>!s)}
            style={{ background:T.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
            <Icon n="userPlus" size={15} color="#fff"/> Invitar agente
          </button>
        )}
      </div>

      {showInvite && (
        <div style={{ background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.primary}33`, marginBottom:20 }}>
          <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:14 }}>Invitar nuevo agente</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={{ color:T.textFaint, fontSize:11, display:'block', marginBottom:5 }}>Email de Google *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={iSt} placeholder="agente@gmail.com"/></div>
            <div><label style={{ color:T.textFaint, fontSize:11, display:'block', marginBottom:5 }}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)} style={iSt} placeholder="Nombre del agente"/></div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {Object.entries(ROLES).map(([r,l])=>(
              <button key={r} onClick={()=>setInviteRole(r)}
                style={{ flex:1, padding:'9px', borderRadius:10, background:inviteRole===r?T.primaryLight:'transparent', border:`1px solid ${inviteRole===r?T.primary:T.border}`, color:inviteRole===r?T.primary:T.textMuted, fontSize:12.5, fontWeight:inviteRole===r?700:400, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleInvite} disabled={loading||!inviteEmail.trim()}
              style={{ flex:1, background:T.primary, border:'none', borderRadius:10, padding:'10px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:loading||!inviteEmail.trim()?0.6:1 }}>
              {loading?'Guardando...':'Guardar invitación'}
            </button>
            <button onClick={()=>setShowInvite(false)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 16px', color:T.textMuted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {agents.map(agent => {
          const isMe    = agent.uid===user?.uid
          const isOwner = agent.email===OWNER_EMAIL
          const [confirm, setConfirm] = useState(false)
          return (
            <div key={agent.id} style={{ background:T.bgCard, borderRadius:12, padding:'16px 18px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                {agent.photoURL
                  ? <img src={agent.photoURL} style={{ width:44,height:44,borderRadius:'50%',objectFit:'cover' }}/>
                  : <div style={{ width:44,height:44,borderRadius:'50%',background:T.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',color:T.primary,fontSize:16,fontWeight:700 }}>{(agent.name||'?').charAt(0).toUpperCase()}</div>
                }
                <div style={{ position:'absolute',bottom:0,right:0 }}><StatusDot status={agent.status||'offline'} size={12}/></div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>{agent.name}</span>
                  {isMe && <span style={{ background:T.primaryLight, color:T.primary, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Vos</span>}
                  {isOwner && <span style={{ background:`${T.warning}18`, color:T.warning, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Owner</span>}
                </div>
                <div style={{ color:T.textMuted, fontSize:12 }}>{agent.email}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                  <div style={{ width:6,height:6,borderRadius:'50%',background:STATUS_COLORS[agent.status]||T.textFaint }}/>
                  <span style={{ color:T.textFaint, fontSize:11 }}>{STATUS_LABELS[agent.status]||'Sin estado'}</span>
                </div>
              </div>
              <div style={{ background:agent.role==='admin'?`${T.warning}18`:T.primaryLight, border:`1px solid ${agent.role==='admin'?T.warning:T.primary}33`, borderRadius:8, padding:'4px 10px', color:agent.role==='admin'?T.warning:T.primary, fontSize:11, fontWeight:700, cursor:isOwner?'default':'pointer' }}
                onClick={()=>{ if(!isOwner&&!isMe&&isAdmin) handleRoleChange(agent) }}>
                {ROLES[agent.role]||'Agente'}
              </div>
              {!isOwner&&!isMe&&isAdmin && (
                <div onClick={()=>handleToggle(agent)}
                  style={{ width:36,height:20,borderRadius:10,background:agent.active?T.success:'#e2e8f0',cursor:'pointer',position:'relative',transition:'all 0.2s',flexShrink:0 }}>
                  <div style={{ width:14,height:14,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:agent.active?18:3,transition:'left 0.2s' }}/>
                </div>
              )}
              {!isOwner&&!isMe&&isAdmin && (
                confirm
                  ? <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>handleDelete(agent)} style={{ background:`${T.danger}12`,border:`1px solid ${T.danger}33`,borderRadius:8,padding:'4px 10px',color:T.danger,fontSize:11,cursor:'pointer',fontWeight:700 }}>Confirmar</button>
                      <button onClick={()=>setConfirm(false)} style={{ background:'transparent',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 8px',color:T.textMuted,fontSize:11,cursor:'pointer' }}>No</button>
                    </div>
                  : <button onClick={()=>setConfirm(true)} style={{ background:'transparent',border:`1px solid ${T.border}`,borderRadius:8,padding:'5px 8px',color:T.textFaint,cursor:'pointer',display:'flex',alignItems:'center' }}>
                      <Icon n="trash" size={14} color={T.textFaint}/>
                    </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
