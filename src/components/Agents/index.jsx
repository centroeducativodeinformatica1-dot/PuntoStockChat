import { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, addDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { Icon } from '../Icon'
import { StatusDot } from '../AgentStatus'
import { OWNER_EMAIL } from '../Auth'

const C = {
  card:'#13111F', surface:'#1C1A2E', border:'rgba(255,255,255,0.06)',
  primary:'#6C47FF', accent:'#00D9B5', text:'#EDEAF8', muted:'#7A7690', faint:'#45425A',
  danger:'#FF4D4D', warning:'#FFB020', success:'#00D9B5',
}

const ROLES = { admin:'Administrador', agent:'Agente' }
const STATUS_COLORS = { online:'#00E676', break:'#FFB020', offline:'#FF4D4D' }
const STATUS_LABELS = { online:'Disponible', break:'En descanso', offline:'No disponible' }

function AgentCard({ agent, isMe, onToggle, onDelete, onRoleChange }) {
  const [confirm, setConfirm] = useState(false)
  const isOwner = agent.email === OWNER_EMAIL

  return (
    <div style={{ background:C.card, borderRadius:14, padding:'18px 20px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:14 }}>
      {/* Avatar */}
      <div style={{ position:'relative', flexShrink:0 }}>
        {agent.photoURL
          ? <img src={agent.photoURL} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover' }}/>
          : <div style={{ width:44, height:44, borderRadius:'50%', background:C.primary+'22', display:'flex', alignItems:'center', justifyContent:'center', color:C.primary, fontSize:16, fontWeight:700 }}>
              {(agent.name||'?').charAt(0).toUpperCase()}
            </div>
        }
        <div style={{ position:'absolute', bottom:0, right:0 }}>
          <StatusDot status={agent.status||'offline'} size={12}/>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{agent.name}</span>
          {isMe && <span style={{ background:'rgba(108,71,255,0.15)', color:C.primary, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Vos</span>}
          {isOwner && <span style={{ background:'rgba(255,176,32,0.12)', color:C.warning, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Owner</span>}
        </div>
        <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>{agent.email}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:STATUS_COLORS[agent.status]||C.faint }}/>
          <span style={{ color:C.faint, fontSize:11 }}>{STATUS_LABELS[agent.status]||'Sin estado'}</span>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ background:agent.role==='admin'?'rgba(255,176,32,0.1)':'rgba(108,71,255,0.1)', border:`1px solid ${agent.role==='admin'?C.warning:C.primary}33`, borderRadius:8, padding:'4px 10px', color:agent.role==='admin'?C.warning:C.primary, fontSize:11, fontWeight:700, cursor:isOwner?'default':'pointer' }}
        onClick={()=>{ if(!isOwner&&!isMe) onRoleChange(agent) }}>
        {ROLES[agent.role]||'Agente'}
      </div>

      {/* Active toggle */}
      {!isOwner && !isMe && (
        <div onClick={()=>onToggle(agent)} title={agent.active?'Desactivar':'Activar'}
          style={{ width:38, height:22, borderRadius:11, background:agent.active?C.success:'#1C1A2E', border:`1px solid ${agent.active?C.success:C.border}`, cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
          <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:agent.active?18:2, transition:'left 0.2s' }}/>
        </div>
      )}

      {/* Delete */}
      {!isOwner && !isMe && (
        confirm
          ? <div style={{ display:'flex', gap:4 }}>
              <button onClick={()=>onDelete(agent)} style={{ background:'rgba(255,77,77,0.15)', border:'1px solid rgba(255,77,77,0.4)', borderRadius:8, padding:'4px 10px', color:C.danger, fontSize:11, cursor:'pointer', fontWeight:700 }}>Confirmar</button>
              <button onClick={()=>setConfirm(false)} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 8px', color:C.muted, fontSize:11, cursor:'pointer' }}>No</button>
            </div>
          : <button onClick={()=>setConfirm(true)} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 8px', color:C.faint, cursor:'pointer', display:'flex', alignItems:'center' }}>
              <Icon n="trash" size={14} color={C.faint}/>
            </button>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const user     = useStore(s => s.user)
  const agentDoc = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const [agents, setAgents] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName,  setInviteName]  = useState('')
  const [inviteRole,  setInviteRole]  = useState('agent')
  const [showInvite,  setShowInvite]  = useState(false)
  const [loading, setLoading] = useState(false)
  const isAdmin = agentDoc?.role === 'admin'

  useEffect(() => {
    const q = query(collection(db, 'agents'), orderBy('createdAt'))
    return onSnapshot(q, snap => setAgents(snap.docs.map(d=>({id:d.id,...d.data()}))))
  }, [])

  const handleToggle = async (agent) => {
    await updateDoc(doc(db, 'agents', agent.id), { active:!agent.active })
    showToast(agent.active ? 'Agente desactivado' : 'Agente activado')
  }

  const handleDelete = async (agent) => {
    await deleteDoc(doc(db, 'agents', agent.id))
    showToast('Agente eliminado', 'error')
  }

  const handleRoleChange = async (agent) => {
    const newRole = agent.role==='admin' ? 'agent' : 'admin'
    await updateDoc(doc(db, 'agents', agent.id), { role:newRole })
    showToast(`Rol cambiado a ${ROLES[newRole]}`)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setLoading(true)
    try {
      // Pre-creates agent doc so they can sign in
      await addDoc(collection(db, 'invites'), {
        email:     inviteEmail.trim().toLowerCase(),
        name:      inviteName.trim() || inviteEmail.split('@')[0],
        role:      inviteRole,
        invitedBy: user.uid,
        invitedAt: Date.now(),
        used:      false,
      })
      showToast(`Invitación guardada para ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setShowInvite(false)
    } catch(e) {
      showToast('Error al invitar', 'error')
    }
    setLoading(false)
  }

  const iSt = { width:'100%', background:'#0B0A14', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text, fontSize:13, outline:'none', fontFamily:'inherit' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ color:C.text, fontSize:18, fontWeight:800, marginBottom:2 }}>Equipo de agentes</div>
          <div style={{ color:C.muted, fontSize:12 }}>{agents.filter(a=>a.active).length} agentes activos · {agents.filter(a=>a.status==='online').length} en línea ahora</div>
        </div>
        {isAdmin && (
          <button onClick={()=>setShowInvite(s=>!s)}
            style={{ background:C.primary, border:'none', borderRadius:12, padding:'10px 18px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            <Icon n="userPlus" size={15} color="#fff"/> Invitar agente
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.primary}44`, marginBottom:20 }}>
          <div style={{ color:C.text, fontSize:14, fontWeight:700, marginBottom:14 }}>Invitar nuevo agente</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ color:C.faint, fontSize:11, display:'block', marginBottom:5 }}>Email de Google *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={iSt} placeholder="agente@gmail.com"/>
            </div>
            <div>
              <label style={{ color:C.faint, fontSize:11, display:'block', marginBottom:5 }}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)} style={iSt} placeholder="Nombre del agente"/>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ color:C.faint, fontSize:11, display:'block', marginBottom:5 }}>Rol</label>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(ROLES).map(([r,l])=>(
                <button key={r} onClick={()=>setInviteRole(r)}
                  style={{ flex:1, padding:'9px', borderRadius:10, background:inviteRole===r?C.primary+'22':'transparent', border:`1px solid ${inviteRole===r?C.primary:C.border}`, color:inviteRole===r?C.primary:C.muted, fontSize:12, fontWeight:inviteRole===r?700:400, cursor:'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(255,176,32,0.06)', border:'1px solid rgba(255,176,32,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.warning, fontSize:11.5, lineHeight:1.6 }}>
            El agente podrá ingresar la próxima vez que use su cuenta de Google en esta plataforma.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleInvite} disabled={loading||!inviteEmail.trim()}
              style={{ flex:1, background:C.primary, border:'none', borderRadius:10, padding:'10px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:loading||!inviteEmail.trim()?0.6:1 }}>
              {loading ? 'Guardando...' : 'Guardar invitación'}
            </button>
            <button onClick={()=>setShowInvite(false)}
              style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', color:C.muted, fontSize:13, cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Agent list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} isMe={agent.uid===user?.uid}
            onToggle={isAdmin?handleToggle:()=>{}}
            onDelete={isAdmin?handleDelete:()=>{}}
            onRoleChange={isAdmin?handleRoleChange:()=>{}}/>
        ))}
      </div>
    </div>
  )
}
