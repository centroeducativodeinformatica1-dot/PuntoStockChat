import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

export default function SettingsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const { mode }  = useTheme()
  const T         = getTheme(mode)
  const [name,   setName]   = useState(agentDoc?.name || '')
  const [saving, setSaving] = useState(false)

  const inp = { width:'100%', background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'system-ui', boxSizing:'border-box', display:'block' }
  const card = { background:T.bgCard, borderRadius:14, padding:24, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:T.shadow }

  const save = async () => {
    if (!user) return
    setSaving(true)
    try { await updateDoc(doc(db,'agents',user.uid),{name}); showToast('Perfil actualizado') }
    catch { showToast('Error al guardar','error') }
    setSaving(false)
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, maxWidth:560, background:T.bg }}>
      <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:2 }}>Configuración</div>
      <div style={{ color:T.textMuted, fontSize:13, marginBottom:24 }}>Tu perfil y preferencias</div>
      <div style={card}>
        <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:18 }}>Mi perfil</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:22 }}>
          {user?.photoURL
            ? <img src={user.photoURL} style={{ width:58, height:58, borderRadius:'50%', border:`2px solid ${T.border}` }}/>
            : <div style={{ width:58, height:58, borderRadius:'50%', background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', color:T.primary, fontSize:22, fontWeight:700 }}>{(agentDoc?.name||'?').charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{ color:T.text, fontWeight:700, fontSize:16 }}>{agentDoc?.name}</div>
            <div style={{ color:T.textMuted, fontSize:13 }}>{user?.email}</div>
            <div style={{ background:agentDoc?.role==='admin'?`${T.warning}18`:T.primaryLight, color:agentDoc?.role==='admin'?T.warning:T.primary, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:5 }}>
              {agentDoc?.role==='admin'?'Administrador':'Agente'}
            </div>
          </div>
        </div>
        <label style={{ display:'block', color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:6 }}>Nombre para mostrar</label>
        <input style={{ ...inp, marginBottom:14 }} value={name} onChange={e=>setName(e.target.value)}/>
        <label style={{ display:'block', color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:6 }}>Email</label>
        <input style={{ ...inp, marginBottom:20, opacity:0.5, cursor:'not-allowed' }} value={user?.email||''} disabled/>
        <button onClick={save} disabled={saving}
          style={{ background:T.primary, border:'none', borderRadius:10, padding:'10px 20px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, opacity:saving?0.7:1 }}>
          <Icon n="save" size={14} color="#fff"/>
          {saving?'Guardando...':'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
