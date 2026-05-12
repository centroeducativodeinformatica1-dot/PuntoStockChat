import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../store'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

// ── WIDGET PAGE ───────────────────────────────────────────────────────────────
const COLORS = ['#2563EB','#0EA5E9','#10B981','#8B5CF6','#EF4444','#F59E0B','#EC4899','#64748B']

export function WidgetPage() {
  const showToast = useStore(s => s.showToast)
  const { mode }  = useTheme()
  const T         = getTheme(mode)
  const [cfg, setCfg] = useState({ botName:'Asistente', greeting:'¡Hola! ¿En qué puedo ayudarte?', primaryColor:'#2563EB', position:'right', autoOpen:false, showOnMobile:true, collectName:true, collectEmail:true })
  const upd = (k,v) => setCfg(p=>({...p,[k]:v}))

  const scriptCode = `<!-- ChatFlow Widget -->
<script>
  window.ChatFlowConfig = {
    projectId: "chat-web-4e49d",
    color: "${cfg.primaryColor}",
    botName: "${cfg.botName}",
    greeting: "${cfg.greeting}",
    position: "${cfg.position}",
    autoOpen: ${cfg.autoOpen},
  };
</script>
<script src="https://cdn.chatflow.app/widget.js" async></script>`

  const iSt = { width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'9px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const Fld = ({ label, children }) => <div style={{ marginBottom:14 }}><div style={{ color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:5 }}>{label}</div>{children}</div>
  const Toggle = ({ checked, onChange }) => (
    <div onClick={()=>onChange(!checked)} style={{ width:38, height:22, borderRadius:11, background:checked?T.primary:'#CBD5E1', cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:checked?18:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, background:T.bg }}>
      <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:4 }}>Widget de chat</div>
      <div style={{ color:T.textMuted, fontSize:13, marginBottom:24 }}>Configurá el chat para tu sitio web</div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.border}`, boxShadow:T.shadow }}>
            <div style={{ color:T.text, fontSize:13, fontWeight:700, marginBottom:16 }}>Apariencia</div>
            <Fld label="Nombre del bot"><input value={cfg.botName} onChange={e=>upd('botName',e.target.value)} style={iSt}/></Fld>
            <Fld label="Mensaje de bienvenida"><textarea value={cfg.greeting} onChange={e=>upd('greeting',e.target.value)} style={{...iSt,resize:'vertical'}} rows={2}/></Fld>
            <Fld label="Color principal">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {COLORS.map(c=>(
                  <div key={c} onClick={()=>upd('primaryColor',c)} style={{ width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer', border:cfg.primaryColor===c?`3px solid ${T.text}`:'3px solid transparent', transition:'border 0.15s', boxShadow:cfg.primaryColor===c?`0 0 0 2px ${c}66`:'none' }}/>
                ))}
              </div>
            </Fld>
            <Fld label="Posición">
              <div style={{ display:'flex', gap:8 }}>
                {['left','right'].map(p=>(
                  <button key={p} onClick={()=>upd('position',p)} style={{ flex:1, padding:'8px', borderRadius:10, background:cfg.position===p?T.primaryLight:'transparent', border:`1px solid ${cfg.position===p?T.primary:T.border}`, color:cfg.position===p?T.primary:T.textMuted, fontSize:12.5, fontWeight:cfg.position===p?700:400, cursor:'pointer', transition:'all 0.15s' }}>
                    {p==='left'?'Izquierda':'Derecha'}
                  </button>
                ))}
              </div>
            </Fld>
          </div>

          <div style={{ background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.border}`, boxShadow:T.shadow }}>
            <div style={{ color:T.text, fontSize:13, fontWeight:700, marginBottom:14 }}>Comportamiento</div>
            {[['autoOpen','Abrir automáticamente'],['showOnMobile','Mostrar en móvil'],['collectName','Pedir nombre'],['collectEmail','Pedir email']].map(([k,l])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ color:T.text, fontSize:13 }}>{l}</span>
                <Toggle checked={cfg[k]} onChange={v=>upd(k,v)}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Preview */}
          <div style={{ background:T.bgCard, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:T.shadow }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ color:T.text, fontSize:13, fontWeight:700 }}>Vista previa</div>
            </div>
            <div style={{ height:300, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', position:'relative' }}>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, opacity:0.3 }}>
                <div style={{ width:120, height:10, background:'#93C5FD', borderRadius:6 }}/>
                <div style={{ width:180, height:8, background:'#93C5FD', borderRadius:6 }}/>
                <div style={{ width:140, height:8, background:'#93C5FD', borderRadius:6 }}/>
              </div>
              <div style={{ position:'absolute', bottom:16, [cfg.position]:16, width:50, height:50, borderRadius:'50%', background:cfg.primaryColor, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${cfg.primaryColor}55` }}>
                <Icon n="message" size={20} color="#fff"/>
              </div>
              <div style={{ position:'absolute', bottom:74, [cfg.position]:16, width:220, background:'#fff', borderRadius:14, boxShadow:'0 8px 30px rgba(0,0,0,0.15)', overflow:'hidden' }}>
                <div style={{ background:cfg.primaryColor, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon n="message" size={13} color="#fff"/>
                  </div>
                  <div>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{cfg.botName}</div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:9 }}>● En línea</div>
                  </div>
                </div>
                <div style={{ padding:10 }}>
                  <div style={{ background:`${cfg.primaryColor}12`, border:`1px solid ${cfg.primaryColor}22`, borderRadius:'8px 8px 8px 2px', padding:'7px 10px', fontSize:11, color:'#1e293b', maxWidth:170 }}>{cfg.greeting}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Code */}
          <div style={{ background:T.bgCard, borderRadius:14, border:`1px solid ${T.border}`, boxShadow:T.shadow }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:T.text, fontSize:13, fontWeight:700 }}>Código de instalación</div>
              <button onClick={()=>{ navigator.clipboard?.writeText(scriptCode); showToast('Código copiado') }}
                style={{ background:T.primaryLight, border:`1px solid ${T.primary}44`, borderRadius:8, padding:'5px 12px', color:T.primary, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                Copiar
              </button>
            </div>
            <pre style={{ margin:0, padding:16, color:T.accent, fontSize:11, lineHeight:1.7, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word', background:T.bg }}>
              {scriptCode}
            </pre>
            <div style={{ padding:'10px 16px', borderTop:`1px solid ${T.border}`, color:T.textFaint, fontSize:11.5 }}>
              Pegá antes del cierre <code style={{ color:T.primary, background:T.primaryLight, padding:'1px 5px', borderRadius:4 }}>&lt;/body&gt;</code> en tu sitio.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SETTINGS PAGE ─────────────────────────────────────────────────────────────
export function SettingsPage() {
  const user      = useStore(s => s.user)
  const agentDoc  = useStore(s => s.agentDoc)
  const showToast = useStore(s => s.showToast)
  const { mode }  = useTheme()
  const T         = getTheme(mode)
  const [name, setName]     = useState(agentDoc?.name || '')
  const [saving, setSaving] = useState(false)

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try { await updateDoc(doc(db,'agents',user.uid),{name}); showToast('Perfil actualizado') }
    catch { showToast('Error al guardar','error') }
    setSaving(false)
  }

  const iSt = { width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, maxWidth:560, background:T.bg }}>
      <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:4 }}>Configuración</div>
      <div style={{ color:T.textMuted, fontSize:13, marginBottom:24 }}>Tu perfil y preferencias</div>

      <div style={{ background:T.bgCard, borderRadius:14, padding:24, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:T.shadow }}>
        <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:18 }}>Mi perfil</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:22 }}>
          {user?.photoURL
            ? <img src={user.photoURL} style={{ width:58, height:58, borderRadius:'50%', border:`2px solid ${T.border}` }}/>
            : <div style={{ width:58, height:58, borderRadius:'50%', background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', color:T.primary, fontSize:22, fontWeight:700 }}>{(agentDoc?.name||'?').charAt(0)}</div>
          }
          <div>
            <div style={{ color:T.text, fontWeight:700, fontSize:16 }}>{agentDoc?.name}</div>
            <div style={{ color:T.textMuted, fontSize:13 }}>{user?.email}</div>
            <div style={{ background:agentDoc?.role==='admin'?`${T.warning}18`:T.primaryLight, color:agentDoc?.role==='admin'?T.warning:T.primary, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:5 }}>
              {agentDoc?.role==='admin'?'Administrador':'Agente'}
            </div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', display:'block', marginBottom:5 }}>Nombre para mostrar</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={iSt}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', display:'block', marginBottom:5 }}>Email</label>
          <input value={user?.email||''} disabled style={{...iSt, opacity:0.5, cursor:'not-allowed'}}/>
        </div>
        <button onClick={saveProfile} disabled={saving}
          style={{ background:T.primary, border:'none', borderRadius:10, padding:'10px 20px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:`0 2px 8px ${T.primary}44`, opacity:saving?0.7:1 }}>
          <Icon n="save" size={14} color="#fff"/> {saving?'Guardando...':'Guardar cambios'}
        </button>
      </div>

      <div style={{ background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.border}`, boxShadow:T.shadow }}>
        <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:8 }}>Acerca de ChatFlow</div>
        <div style={{ color:T.textMuted, fontSize:12.5, lineHeight:1.7 }}>Versión 1.0.0 · React + Firebase · Modo {mode==='light'?'claro':'oscuro'} activo</div>
      </div>
    </div>
  )
}
