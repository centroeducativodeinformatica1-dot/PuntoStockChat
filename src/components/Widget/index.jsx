import { useState } from 'react'
import { useStore } from '../../store'
import { Icon } from '../Icon'

const C = {
  card:'#13111F', surface:'#1C1A2E', border:'rgba(255,255,255,0.06)',
  primary:'#6C47FF', accent:'#00D9B5', text:'#EDEAF8', muted:'#7A7690', faint:'#45425A',
  danger:'#FF4D4D',
}

const COLORS = ['#6C47FF','#00D9B5','#FF5757','#FFB547','#2196F3','#E91E63','#FF5722','#607D8B']

export default function WidgetPage() {
  const showToast = useStore(s => s.showToast)
  const [cfg, setCfg] = useState({
    botName:     'Asistente',
    greeting:    '👋 ¡Hola! ¿En qué puedo ayudarte?',
    primaryColor:'#6C47FF',
    position:    'right',
    autoOpen:    false,
    showOnMobile:true,
    collectEmail:true,
    collectName: true,
    offlineMsg:  'Dejanos tu mensaje y te respondemos pronto.',
  })
  const upd = (k,v) => setCfg(p=>({...p,[k]:v}))

  const projectId = 'chat-web-4e49d'
  const scriptCode = `<!-- ChatFlow Widget -->
<script>
  window.ChatFlowConfig = {
    projectId: "${projectId}",
    color:     "${cfg.primaryColor}",
    botName:   "${cfg.botName}",
    greeting:  "${cfg.greeting}",
    position:  "${cfg.position}",
    autoOpen:  ${cfg.autoOpen},
  };
</script>
<script src="https://cdn.chatflow.app/widget.js" async></script>`

  const iSt = { width:'100%', background:'#0B0A14', border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const Fld = ({ label, children }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ color:C.faint, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  )
  const Toggle = ({ checked, onChange }) => (
    <div onClick={()=>onChange(!checked)} style={{ width:38, height:22, borderRadius:11, background:checked?C.primary:'#1C1A2E', border:`1px solid ${checked?C.primary:C.border}`, cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:checked?18:2, transition:'left 0.2s' }}/>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24 }}>
      <div style={{ color:C.text, fontSize:18, fontWeight:800, marginBottom:4 }}>Widget de chat</div>
      <div style={{ color:C.muted, fontSize:12, marginBottom:24 }}>Configurá el widget que se instala en tu sitio web</div>

      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:20 }}>
        {/* Config panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
            <div style={{ color:C.text, fontSize:13, fontWeight:700, marginBottom:16 }}>Apariencia</div>
            <Fld label="Nombre del bot">
              <input value={cfg.botName} onChange={e=>upd('botName',e.target.value)} style={iSt}/>
            </Fld>
            <Fld label="Mensaje de bienvenida">
              <textarea value={cfg.greeting} onChange={e=>upd('greeting',e.target.value)} style={{...iSt,resize:'vertical'}} rows={2}/>
            </Fld>
            <Fld label="Color principal">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {COLORS.map(color=>(
                  <div key={color} onClick={()=>upd('primaryColor',color)}
                    style={{ width:30, height:30, borderRadius:'50%', background:color, cursor:'pointer', border:cfg.primaryColor===color?'3px solid #fff':'3px solid transparent', transition:'border 0.15s', boxShadow:cfg.primaryColor===color?`0 0 0 2px ${color}`:'none' }}/>
                ))}
              </div>
            </Fld>
            <Fld label="Posición">
              <div style={{ display:'flex', gap:8 }}>
                {['left','right'].map(p=>(
                  <button key={p} onClick={()=>upd('position',p)}
                    style={{ flex:1, padding:'8px', borderRadius:10, background:cfg.position===p?C.primary+'22':'transparent', border:`1px solid ${cfg.position===p?C.primary:C.border}`, color:cfg.position===p?C.primary:C.muted, fontSize:12, fontWeight:cfg.position===p?700:400, cursor:'pointer' }}>
                    {p==='left'?'Izquierda':'Derecha'}
                  </button>
                ))}
              </div>
            </Fld>
          </div>

          <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
            <div style={{ color:C.text, fontSize:13, fontWeight:700, marginBottom:16 }}>Comportamiento</div>
            {[
              ['autoOpen',     'Abrir automáticamente al cargar'],
              ['showOnMobile', 'Mostrar en dispositivos móviles'],
              ['collectName',  'Pedir nombre al visitante'],
              ['collectEmail', 'Pedir email al visitante'],
            ].map(([key,label])=>(
              <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ color:C.text, fontSize:13 }}>{label}</span>
                <Toggle checked={cfg[key]} onChange={v=>upd(key,v)}/>
              </div>
            ))}
            <Fld label="Mensaje offline">
              <textarea value={cfg.offlineMsg} onChange={e=>upd('offlineMsg',e.target.value)} style={{...iSt,resize:'vertical'}} rows={2}/>
            </Fld>
          </div>
        </div>

        {/* Code + preview */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Widget preview */}
          <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>Vista previa</div>
            </div>
            <div style={{ height:320, background:'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', position:'relative' }}>
              {/* Fake site */}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, opacity:0.2 }}>
                <div style={{ width:120, height:12, background:'#fff', borderRadius:6 }}/>
                <div style={{ width:200, height:8, background:'#fff', borderRadius:6 }}/>
                <div style={{ width:160, height:8, background:'#fff', borderRadius:6 }}/>
              </div>
              {/* Widget button */}
              <div style={{ position:'absolute', bottom:16, [cfg.position]:16, width:52, height:52, borderRadius:'50%', background:cfg.primaryColor, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 20px ${cfg.primaryColor}66` }}>
                <Icon n="message" size={22} color="#fff"/>
              </div>
              {/* Mini chat */}
              <div style={{ position:'absolute', bottom:78, [cfg.position]:16, width:220, background:'#fff', borderRadius:12, boxShadow:'0 10px 40px rgba(0,0,0,0.3)', overflow:'hidden' }}>
                <div style={{ background:cfg.primaryColor, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
                  <div>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{cfg.botName}</div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:9 }}>En línea</div>
                  </div>
                </div>
                <div style={{ padding:10 }}>
                  <div style={{ background:cfg.primaryColor+'18', borderRadius:'8px 8px 8px 2px', padding:'7px 10px', fontSize:11, color:'#1a1a2e', maxWidth:160 }}>
                    {cfg.greeting}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Install code */}
          <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>Código de instalación</div>
              <button onClick={()=>{ navigator.clipboard?.writeText(scriptCode); showToast('Código copiado'); }}
                style={{ background:C.primary+'22', border:`1px solid ${C.primary}44`, borderRadius:8, padding:'5px 12px', color:C.primary, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                Copiar
              </button>
            </div>
            <pre style={{ margin:0, padding:16, color:C.accent, fontSize:11, lineHeight:1.7, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word', background:'#0B0A14', borderRadius:'0 0 14px 14px' }}>
              {scriptCode}
            </pre>
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, color:C.faint, fontSize:11, lineHeight:1.6 }}>
              Pegá este código justo antes del cierre de la etiqueta <code style={{ color:C.accent }}>&lt;/body&gt;</code> en tu sitio web.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
