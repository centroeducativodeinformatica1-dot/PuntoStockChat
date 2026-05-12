import { useState, useRef, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore } from '../store'
import { useTheme } from '../lib/ThemeContext'
import { getTheme } from '../lib/theme'
import { Icon } from './Icon'

const STATUSES = [
  { id:'online',  label:'Disponible',    color:'#10B981', icon:'wifi',    bg:'rgba(16,185,129,0.1)'  },
  { id:'break',   label:'En descanso',   color:'#F59E0B', icon:'coffee',  bg:'rgba(245,158,11,0.1)'  },
  { id:'offline', label:'No disponible', color:'#EF4444', icon:'wifiOff', bg:'rgba(239,68,68,0.1)'   },
]

export function AgentStatusPicker() {
  const user        = useStore(s => s.user)
  const agentStatus = useStore(s => s.agentStatus)
  const setStatus   = useStore(s => s.setAgentStatus)
  const { mode }    = useTheme()
  const T           = getTheme(mode)
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const current = STATUSES.find(s => s.id === agentStatus) || STATUSES[0]

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSelect = async (s) => {
    setOpen(false); setStatus(s.id)
    if (user) { try { await updateDoc(doc(db,'agents',user.uid),{status:s.id}) } catch {} }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, background:current.bg, border:`1.5px solid ${current.color}44`, borderRadius:20, padding:'5px 12px 5px 8px', cursor:'pointer', color:current.color, fontSize:12.5, fontWeight:600, transition:'all 0.15s' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:current.color, boxShadow:`0 0 6px ${current.color}` }}/>
        {current.label}
        <Icon n="chevronDown" size={12} color={current.color}/>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', width:190, zIndex:100, boxShadow:T.shadowLg }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:agentStatus===s.id?s.bg:'transparent', border:'none', cursor:'pointer', color:agentStatus===s.id?s.color:T.textMuted, fontSize:13, fontWeight:agentStatus===s.id?700:400, textAlign:'left', transition:'background 0.1s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
              <Icon n={s.icon} size={14} color={agentStatus===s.id?s.color:T.textMuted}/>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatusDot({ status, size = 10 }) {
  const s = STATUSES.find(x => x.id === status) || STATUSES[2]
  return <div style={{ width:size, height:size, borderRadius:'50%', background:s.color, border:'2px solid transparent', boxShadow:`0 0 4px ${s.color}88`, flexShrink:0 }}/>
}
