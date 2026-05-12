import { useState, useRef, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { Icon } from '../Icon'

const STATUSES = [
  { id: 'online', label: 'Disponible',   color: '#00E676', icon: 'wifi',    bg: 'rgba(0,230,118,0.12)'  },
  { id: 'break',  label: 'En descanso',  color: '#FFB020', icon: 'coffee',  bg: 'rgba(255,176,32,0.12)' },
  { id: 'offline',label: 'No disponible',color: '#FF4D4D', icon: 'wifiOff', bg: 'rgba(255,77,77,0.12)'  },
]

export function AgentStatusPicker() {
  const user        = useStore(s => s.user)
  const agentDoc    = useStore(s => s.agentDoc)
  const agentStatus = useStore(s => s.agentStatus)
  const setStatus   = useStore(s => s.setAgentStatus)
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const current = STATUSES.find(s => s.id === agentStatus) || STATUSES[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (s) => {
    setOpen(false)
    setStatus(s.id)
    if (user) {
      try { await updateDoc(doc(db, 'agents', user.uid), { status: s.id }) } catch {}
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, background:current.bg, border:`1px solid ${current.color}44`, borderRadius:10, padding:'6px 12px', cursor:'pointer', color:current.color, fontSize:12, fontWeight:700, transition:'all 0.15s' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:current.color, boxShadow:`0 0 6px ${current.color}` }}/>
        {current.label}
        <Icon n="chevronDown" size={12} color={current.color}/>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#1C1A2E', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden', width:180, zIndex:100, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:agentStatus===s.id?s.bg:'transparent', border:'none', cursor:'pointer', color:agentStatus===s.id?s.color:'#7A7690', fontSize:13, fontWeight:agentStatus===s.id?700:400, textAlign:'left', transition:'background 0.1s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, boxShadow:agentStatus===s.id?`0 0 6px ${s.color}`:'none', flexShrink:0 }}/>
              <Icon n={s.icon} size={14} color={agentStatus===s.id?s.color:'#7A7690'}/>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Small dot indicator for conversation list / sidebar
export function StatusDot({ status, size = 10 }) {
  const s = STATUSES.find(x => x.id === status) || STATUSES[2]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:s.color, border:`2px solid #13111F`, boxShadow:`0 0 4px ${s.color}88`, flexShrink:0 }}/>
  )
}
