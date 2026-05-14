import { useState } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { useStore } from '../../store'
import { Icon } from '../Icon'

const COLORS = ['#2563EB','#0EA5E9','#10B981','#8B5CF6','#EF4444','#F59E0B','#EC4899','#64748B']

export default function WidgetPage() {
  const { mode } = useTheme()
  const T = getTheme(mode)
  const showToast = useStore(s => s.showToast)

  const [botName,      setBotName]      = useState('Asistente')
  const [greeting,     setGreeting]     = useState('¡Hola! ¿En qué puedo ayudarte?')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [position,     setPosition]     = useState('right')
  const [autoOpen,     setAutoOpen]     = useState(false)

  const inp = { width:'100%', background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 12px', color:T.text, fontSize:13, outline:'none', fontFamily:'system-ui', boxSizing:'border-box', display:'block' }
  const lbl = { display:'block', color:T.textFaint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:6 }
  const card = { background:T.bgCard, borderRadius:14, padding:20, border:`1px solid ${T.border}`, boxShadow:T.shadow, marginBottom:14 }

  // ← URL real del widget hospedado en Vercel
  const WIDGET_URL = 'https://punto-stock-chat.vercel.app/widget.js'

  const code = `<!-- ChatFlow Widget -->
<script>
  window.ChatFlowConfig = {
    projectId: "chat-web-4e49d",
    apiKey: "AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko",
    color: "${primaryColor}",
    botName: "${botName}",
    greeting: "${greeting}",
    position: "${position}",
    autoOpen: ${autoOpen},
  };
</script>
<script src="${WIDGET_URL}" async></script>`

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, background:T.bg }}>
      <div style={{ color:T.text, fontSize:18, fontWeight:800, marginBottom:2 }}>Widget de chat</div>
      <div style={{ color:T.textMuted, fontSize:13, marginBottom:22 }}>Configurá e instalá el widget en tu sitio web</div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20 }}>
        <div>
          <div style={card}>
            <div style={{ color:T.text, fontSize:13, fontWeight:700, marginBottom:16 }}>Apariencia</div>
            <label style={lbl}>Nombre del bot</label>
            <input style={{ ...inp, marginBottom:14 }} value={botName} onChange={e=>setBotName(e.target.value)}/>
            <label style={lbl}>Mensaje de bienvenida</label>
            <textarea style={{ ...inp, resize:'vertical', lineHeight:1.5, marginBottom:14 }} rows={2} value={greeting} onChange={e=>setGreeting(e.target.value)}/>
            <label style={lbl}>Color principal</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {COLORS.map(c=>(
                <div key={c} onClick={()=>setPrimaryColor(c)}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', outline:primaryColor===c?`3px solid ${c}`:'3px solid transparent', outlineOffset:2 }}/>
              ))}
            </div>
            <label style={lbl}>Posición</label>
            <div style={{ display:'flex', gap:8 }}>
              {['left','right'].map(p=>(
                <button key={p} onClick={()=>setPosition(p)}
                  style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', background:position===p?T.primary:'transparent', border:`1px solid ${position===p?T.primary:T.border}`, color:position===p?'#fff':T.textMuted, fontSize:13, fontWeight:position===p?700:400 }}>
                  {p==='left'?'Izquierda':'Derecha'}
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ color:T.text, fontSize:13, fontWeight:700, marginBottom:14 }}>Comportamiento</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ color:T.text, fontSize:13 }}>Abrir automáticamente</span>
              <div onClick={()=>setAutoOpen(v=>!v)}
                style={{ width:38, height:22, borderRadius:11, background:autoOpen?T.primary:'#CBD5E1', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:autoOpen?18:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ ...card, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.text, fontSize:13, fontWeight:700 }}>Vista previa</span>
            </div>
            <div style={{ height:280, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', position:'relative' }}>
              <div style={{ position:'absolute', bottom:14, [position]:14, width:48, height:48, borderRadius:'50%', background:primaryColor, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${primaryColor}66` }}>
                <Icon n="message" size={20} color="#fff"/>
              </div>
              <div style={{ position:'absolute', bottom:70, [position]:14, width:210, background:'#fff', borderRadius:12, boxShadow:'0 6px 24px rgba(0,0,0,0.15)', overflow:'hidden' }}>
                <div style={{ background:primaryColor, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon n="message" size={13} color="#fff"/>
                  </div>
                  <div>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{botName||'Bot'}</div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:9 }}>● En línea</div>
                  </div>
                </div>
                <div style={{ padding:10 }}>
                  <div style={{ background:`${primaryColor}12`, border:`1px solid ${primaryColor}22`, borderRadius:'8px 8px 8px 2px', padding:'7px 10px', fontSize:11, color:'#1e293b' }}>
                    {greeting||'¡Hola!'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ color:T.text, fontSize:13, fontWeight:700 }}>Código de instalación</span>
              <button onClick={()=>{ navigator.clipboard?.writeText(code); showToast('Código copiado') }}
                style={{ background:T.primaryLight, border:`1px solid ${T.primary}44`, borderRadius:8, padding:'5px 12px', color:T.primary, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                Copiar
              </button>
            </div>
            <pre style={{ margin:0, background:T.bgSurface, borderRadius:10, padding:14, color:'#0EA5E9', fontSize:11, lineHeight:1.7, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {code}
            </pre>
            <div style={{ marginTop:10, background:`${T.success}10`, border:`1px solid ${T.success}33`, borderRadius:8, padding:'8px 12px', color:T.success, fontSize:11.5, display:'flex', gap:8, alignItems:'center' }}>
              <Icon n="check" size={12} color={T.success}/>
              El widget se conecta en tiempo real con el chat. Los mensajes llegan instantáneamente.
            </div>
            <div style={{ marginTop:8, color:T.textFaint, fontSize:11.5 }}>
              Pegá esto antes del cierre <code style={{ color:T.primary, background:T.primaryLight, padding:'1px 5px', borderRadius:4 }}>&lt;/body&gt;</code> en tu sitio.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
