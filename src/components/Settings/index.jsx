import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { Icon } from '../Icon'

const C = {
  card:'#13111F', surface:'#1C1A2E', border:'rgba(255,255,255,0.06)',
  primary:'#6C47FF', text:'#EDEAF8', muted:'#7A7690', faint:'#45425A', success:'#00D9B5',
}

export default function SettingsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const [name, setName] = useState(agentDoc?.name || '')
  const [saving, setSaving] = useState(false)

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'agents', user.uid), { name })
      showToast('Perfil actualizado')
    } catch { showToast('Error al guardar', 'error') }
    setSaving(false)
  }

  const iSt = { width:'100%', background:'#0B0A14', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, maxWidth:600 }}>
      <div style={{ color:C.text, fontSize:18, fontWeight:800, marginBottom:4 }}>Configuración</div>
      <div style={{ color:C.muted, fontSize:12, marginBottom:24 }}>Tu perfil y preferencias</div>

      <div style={{ background:C.card, borderRadius:14, padding:24, border:`1px solid ${C.border}`, marginBottom:16 }}>
        <div style={{ color:C.text, fontSize:14, fontWeight:700, marginBottom:18 }}>Mi perfil</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          {user?.photoURL
            ? <img src={user.photoURL} style={{ width:60, height:60, borderRadius:'50%' }}/>
            : <div style={{ width:60, height:60, borderRadius:'50%', background:C.primary+'22', display:'flex', alignItems:'center', justifyContent:'center', color:C.primary, fontSize:22, fontWeight:700 }}>{(agentDoc?.name||'?').charAt(0)}</div>
          }
          <div>
            <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>{agentDoc?.name}</div>
            <div style={{ color:C.muted, fontSize:13 }}>{user?.email}</div>
            <div style={{ background:agentDoc?.role==='admin'?'rgba(255,176,32,0.12)':'rgba(108,71,255,0.12)', color:agentDoc?.role==='admin'?'#FFB020':C.primary, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:4 }}>
              {agentDoc?.role==='admin'?'Administrador':'Agente'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ color:C.faint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', display:'block', marginBottom:5 }}>Nombre para mostrar</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={iSt} placeholder="Tu nombre"/>
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ color:C.faint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', display:'block', marginBottom:5 }}>Email (solo lectura)</label>
          <input value={user?.email||''} disabled style={{...iSt, opacity:0.5, cursor:'not-allowed'}}/>
        </div>
        <button onClick={saveProfile} disabled={saving}
          style={{ background:C.primary, border:'none', borderRadius:10, padding:'10px 20px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, opacity:saving?0.7:1 }}>
          <Icon n="save" size={14} color="#fff"/> {saving?'Guardando...':'Guardar cambios'}
        </button>
      </div>

      <div style={{ background:C.card, borderRadius:14, padding:24, border:`1px solid ${C.border}` }}>
        <div style={{ color:C.text, fontSize:14, fontWeight:700, marginBottom:10 }}>Acerca de ChatFlow</div>
        <div style={{ color:C.muted, fontSize:12, lineHeight:1.7 }}>
          Versión 1.0.0 · Desarrollado con Firebase + React<br/>
          Plataforma de atención al cliente en tiempo real.
        </div>
      </div>
    </div>
  )
}
