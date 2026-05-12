import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

const NODE_TYPES = {
  trigger:   { label:'Disparador',    icon:'zap',     color:'#F59E0B', bg:'light:#FEF3C7|dark:#2A1F00', border:'light:#FDE68A|dark:#6A5210' },
  message:   { label:'Mensaje',       icon:'message',  color:'#2563EB', bg:'light:#EFF6FF|dark:#1A2540', border:'light:#BFDBFE|dark:#2D4080' },
  options:   { label:'Opciones',      icon:'shuffle',  color:'#10B981', bg:'light:#ECFDF5|dark:#0D2420', border:'light:#A7F3D0|dark:#1A5C52' },
  condition: { label:'Condición',     icon:'help',     color:'#F97316', bg:'light:#FFF7ED|dark:#251800', border:'light:#FED7AA|dark:#6B3A1A' },
  input:     { label:'Pedir dato',    icon:'editPen',  color:'#8B5CF6', bg:'light:#F5F3FF|dark:#1E1040', border:'light:#DDD6FE|dark:#5C2E8A' },
  delay:     { label:'Espera',        icon:'clock',    color:'#EF4444', bg:'light:#FEF2F2|dark:#250E0E', border:'light:#FECACA|dark:#6B1A1A' },
  agent:     { label:'Agente humano', icon:'user',     color:'#0EA5E9', bg:'light:#F0F9FF|dark:#0D1E2A', border:'light:#BAE6FD|dark:#1A5070' },
  end:       { label:'Fin',           icon:'flag',     color:'#64748B', bg:'light:#F8FAFC|dark:#16141F', border:'light:#CBD5E1|dark:#3A3850' },
}
const PALETTE = Object.entries(NODE_TYPES).filter(([k])=>k!=='trigger'&&k!=='end')

const INIT_NODES = [
  { id:'n1', type:'trigger',  x:60,  y:180, data:{ label:'Primera visita', trigger:'page_visit' } },
  { id:'n2', type:'message',  x:310, y:100, data:{ text:'¡Hola! Bienvenido. ¿En qué puedo ayudarte?' } },
  { id:'n3', type:'options',  x:310, y:290, data:{ text:'Elegí una opción:', options:['Ver productos','Soporte técnico','Hablar con agente'] } },
  { id:'n4', type:'message',  x:580, y:100, data:{ text:'Te muestro nuestro catálogo.' } },
  { id:'n5', type:'input',    x:580, y:270, data:{ question:'¿Cuál es tu problema?', variable:'issue' } },
  { id:'n6', type:'agent',    x:580, y:430, data:{ message:'Un agente te atenderá pronto.', team:'any' } },
  { id:'n7', type:'delay',    x:840, y:270, data:{ seconds:5, message:'Buscando soluciones...' } },
  { id:'n8', type:'message',  x:840, y:100, data:{ text:'¿Encontraste lo que buscabas?' } },
  { id:'n9', type:'end',      x:840, y:430, data:{ label:'Fin de flujo' } },
]
const INIT_EDGES = [
  { id:'e1', from:'n1', fromPort:'out',   to:'n2', toPort:'in' },
  { id:'e2', from:'n1', fromPort:'out',   to:'n3', toPort:'in' },
  { id:'e3', from:'n3', fromPort:'opt-0', to:'n4', toPort:'in' },
  { id:'e4', from:'n3', fromPort:'opt-1', to:'n5', toPort:'in' },
  { id:'e5', from:'n3', fromPort:'opt-2', to:'n6', toPort:'in' },
  { id:'e6', from:'n5', fromPort:'out',   to:'n7', toPort:'in' },
  { id:'e7', from:'n4', fromPort:'out',   to:'n8', toPort:'in' },
  { id:'e8', from:'n7', fromPort:'out',   to:'n9', toPort:'in' },
]

const NODE_W = 210
const getNodeH = n => n.type==='options' ? 62+(n.data.options?.length||0)*30+16 : n.type==='condition' ? 120 : 82
const getPortPos = (node, port) => {
  const h = getNodeH(node)
  if (port==='in')  return { x:node.x,        y:node.y+h/2 }
  if (port==='out') return { x:node.x+NODE_W, y:node.y+h/2 }
  if (port.startsWith('opt-')) { const i=parseInt(port.split('-')[1]); return { x:node.x+NODE_W, y:node.y+60+i*30+11 } }
  return { x:node.x+NODE_W, y:node.y+h/2 }
}

const getNT = (type, mode) => {
  const t = NODE_TYPES[type]
  const bg = t.bg.split('|').find(s=>s.startsWith(mode+':'))?.slice(mode.length+1) || '#fff'
  const border = t.border.split('|').find(s=>s.startsWith(mode+':'))?.slice(mode.length+1) || '#ccc'
  return { ...t, bg, border }
}

const EdgePath = ({ from, to, color, selected, onClick }) => {
  const dx = Math.max(Math.abs(to.x-from.x)*0.5, 60)
  const d = `M${from.x},${from.y} C${from.x+dx},${from.y} ${to.x-dx},${to.y} ${to.x},${to.y}`
  return (
    <g onClick={onClick} style={{ cursor:'pointer' }}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={14}/>
      <path d={d} fill="none" stroke={selected?color:color+'99'} strokeWidth={selected?2.5:1.8} style={{ filter:selected?`drop-shadow(0 0 4px ${color})`:'none', transition:'stroke 0.15s' }}/>
      <circle cx={to.x} cy={to.y} r={4} fill={color}/>
    </g>
  )
}

const NodeSvgIcon = ({ n, x, y, size=14, color }) => {
  const PATHS = {
    zap:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    message:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    shuffle:<><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></>,
    help:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    editPen:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    clock:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    user:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    flag:<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
  }
  const s = size/24
  return <g transform={`translate(${x-size/2},${y-size/2}) scale(${s})`}><svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{PATHS[n]}</svg></g>
}

function FlowNode({ node, selected, onSelect, onDragStart, onPortDown, onPortUp, connecting, mode }) {
  const t = getNT(node.type, mode)
  const h = getNodeH(node)
  const isTarget = connecting && connecting.nodeId!==node.id
  const outPorts = node.type==='options' ? (node.data.options||[]).map((_,i)=>`opt-${i}`) : node.type!=='end' ? ['out'] : []
  const T = getTheme(mode)

  return (
    <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'grab', userSelect:'none' }}
      onMouseDown={e=>{ e.stopPropagation(); onDragStart(e,node.id); onSelect(node.id) }}>
      {selected && <rect x={-4} y={-4} width={NODE_W+8} height={h+8} rx={14} fill={t.color+'18'}/>}
      <rect x={0} y={0} width={NODE_W} height={h} rx={11} fill={t.bg} stroke={selected?t.color:isTarget?T.accent:t.border} strokeWidth={selected?2:1} style={{ filter:selected?`drop-shadow(0 0 8px ${t.color}44)`:'none', transition:'all 0.15s' }}/>
      <rect x={0} y={0} width={NODE_W} height={33} rx={11} fill={t.color+'22'}/>
      <rect x={0} y={21} width={NODE_W} height={12} fill={t.color+'22'}/>
      <NodeSvgIcon n={t.icon} x={18} y={17} size={13} color={t.color}/>
      <text x={32} y={21} fontSize={11.5} fill={t.color} fontWeight={700} fontFamily="system-ui">{t.label}</text>

      {(node.type==='message'||node.type==='input'||node.type==='agent') && (
        <foreignObject x={8} y={37} width={NODE_W-16} height={36}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:10.5, color:T.textMuted, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {node.data.text||node.data.question||node.data.message}
          </div>
        </foreignObject>
      )}
      {(node.type==='trigger'||node.type==='end') && <text x={10} y={56} fontSize={10.5} fill={T.textMuted} fontFamily="system-ui">{node.data.label}</text>}
      {node.type==='delay' && <text x={10} y={56} fontSize={10.5} fill={T.textMuted} fontFamily="system-ui">Espera: {node.data.seconds}s</text>}
      {node.type==='options' && <>
        <text x={10} y={55} fontSize={10.5} fill={T.textMuted} fontFamily="system-ui">{node.data.text}</text>
        {(node.data.options||[]).map((opt,i)=>(
          <g key={i}>
            <rect x={8} y={60+i*30} width={NODE_W-16} height={22} rx={6} fill={t.color+'18'} stroke={t.color+'44'} strokeWidth={0.8}/>
            <text x={15} y={75+i*30} fontSize={9.5} fill={t.color} fontFamily="system-ui" fontWeight={600}>{opt.length>24?opt.slice(0,24)+'…':opt}</text>
          </g>
        ))}
      </>}

      {node.type!=='trigger' && (
        <g onMouseUp={e=>{ e.stopPropagation(); onPortUp(node.id,'in') }}>
          <circle cx={0} cy={h/2} r={9} fill="transparent" style={{ cursor:'crosshair' }}/>
          <circle cx={0} cy={h/2} r={6} fill={t.bg} stroke={isTarget?T.accent:t.border} strokeWidth={1.5} style={{ filter:isTarget?`drop-shadow(0 0 4px ${T.accent})`:'none' }}/>
          <circle cx={0} cy={h/2} r={3} fill={isTarget?T.accent:t.border}/>
        </g>
      )}
      {outPorts.map(port=>{
        const py = port==='out'?h/2:60+parseInt(port.split('-')[1])*30+11
        return (
          <g key={port} onMouseDown={e=>{ e.stopPropagation(); onPortDown(node.id,port) }}>
            <circle cx={NODE_W} cy={py} r={10} fill="transparent" style={{ cursor:'crosshair' }}/>
            <circle cx={NODE_W} cy={py} r={6} fill={t.bg} stroke={t.color} strokeWidth={1.5}/>
            <circle cx={NODE_W} cy={py} r={3} fill={t.color}/>
          </g>
        )
      })}
    </g>
  )
}

const iSt = (T) => ({ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 10px', color:T.text, fontSize:12.5, outline:'none', fontFamily:'system-ui', boxSizing:'border-box' })
const taSt = (T) => ({ ...iSt(T), resize:'vertical', lineHeight:1.5 })
const Fld = ({ label, children, T }) => <div style={{ marginBottom:14 }}><div style={{ color:T.textFaint, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', marginBottom:5 }}>{label}</div>{children}</div>

function NodeEditor({ node, onChange, onDelete, onClose, mode }) {
  const T = getTheme(mode)
  if (!node) return (
    <div style={{ padding:24, textAlign:'center', marginTop:50 }}>
      <Icon n="nodes" size={28} color={T.textFaint} style={{ margin:'0 auto 12px' }}/>
      <div style={{ color:T.textFaint, fontSize:12.5, lineHeight:1.7 }}>Hacé click en un nodo para editarlo.<br/>Arrastrá el punto derecho al izquierdo de otro nodo para conectarlos.</div>
    </div>
  )
  const t = getNT(node.type, mode)
  const upd = (k,v) => onChange(node.id,{...node.data,[k]:v})
  const updOpt = (i,v) => { const o=[...(node.data.options||[])]; o[i]=v; onChange(node.id,{...node.data,options:o}) }
  const addOpt = () => onChange(node.id,{...node.data,options:[...(node.data.options||[]),'Nueva opción']})
  const delOpt = i => { const o=[...(node.data.options||[])]; o.splice(i,1); onChange(node.id,{...node.data,options:o}) }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:t.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon n={t.icon} size={15} color={t.color}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:t.color, fontSize:10.5, fontWeight:700, letterSpacing:0.5 }}>{t.label.toUpperCase()}</div>
          <div style={{ color:T.textFaint, fontSize:9.5 }}>id: {node.id}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center' }}>
          <Icon n="x" size={15} color={T.textFaint}/>
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:14 }}>
        {node.type==='message' && <Fld label="Texto" T={T}><textarea value={node.data.text||''} onChange={e=>upd('text',e.target.value)} style={taSt(T)} rows={4}/></Fld>}
        {node.type==='options' && <>
          <Fld label="Texto introductorio" T={T}><input value={node.data.text||''} onChange={e=>upd('text',e.target.value)} style={iSt(T)}/></Fld>
          <Fld label="Botones" T={T}>
            {(node.data.options||[]).map((opt,i)=>(
              <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:t.color, flexShrink:0 }}/>
                <input value={opt} onChange={e=>updOpt(i,e.target.value)} style={{...iSt(T),flex:1}}/>
                <button onClick={()=>delOpt(i)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex' }}><Icon n="x" size={13} color={T.danger}/></button>
              </div>
            ))}
            <button onClick={addOpt} style={{ width:'100%', background:t.color+'12', border:`1px dashed ${t.color}55`, borderRadius:8, padding:'7px', color:t.color, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
              <Icon n="plus" size={13} color={t.color}/> Agregar botón
            </button>
          </Fld>
        </>}
        {node.type==='trigger' && <>
          <Fld label="Nombre" T={T}><input value={node.data.label||''} onChange={e=>upd('label',e.target.value)} style={iSt(T)}/></Fld>
          <Fld label="Evento" T={T}>
            <select value={node.data.trigger||'page_visit'} onChange={e=>upd('trigger',e.target.value)} style={{...iSt(T),appearance:'none'}}>
              <option value="page_visit">Primera visita</option>
              <option value="return_visit">Visita recurrente</option>
              <option value="exit_intent">Intención de salida</option>
              <option value="cart_abandon">Carrito abandonado</option>
              <option value="manual">Manual / API</option>
            </select>
          </Fld>
        </>}
        {node.type==='input' && <>
          <Fld label="Pregunta" T={T}><textarea value={node.data.question||''} onChange={e=>upd('question',e.target.value)} style={taSt(T)} rows={3}/></Fld>
          <Fld label="Variable" T={T}><input value={node.data.variable||''} onChange={e=>upd('variable',e.target.value)} style={iSt(T)} placeholder="nombre, email..."/></Fld>
        </>}
        {node.type==='delay' && <>
          <Fld label={`Espera: ${node.data.seconds||0}s`} T={T}><input type="range" min={1} max={120} value={node.data.seconds||5} onChange={e=>upd('seconds',+e.target.value)} style={{ width:'100%' }}/></Fld>
          <Fld label="Mensaje" T={T}><input value={node.data.message||''} onChange={e=>upd('message',e.target.value)} style={iSt(T)}/></Fld>
        </>}
        {node.type==='agent' && <>
          <Fld label="Mensaje de transferencia" T={T}><textarea value={node.data.message||''} onChange={e=>upd('message',e.target.value)} style={taSt(T)} rows={3}/></Fld>
          <Fld label="Equipo" T={T}>
            <select value={node.data.team||'any'} onChange={e=>upd('team',e.target.value)} style={{...iSt(T),appearance:'none'}}>
              <option value="any">Cualquier agente</option>
              <option value="sales">Ventas</option>
              <option value="support">Soporte</option>
            </select>
          </Fld>
        </>}
        {node.type==='end' && <Fld label="Etiqueta" T={T}><input value={node.data.label||''} onChange={e=>upd('label',e.target.value)} style={iSt(T)}/></Fld>}
      </div>
      {node.type!=='trigger' && (
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>onDelete(node.id)} style={{ width:'100%', background:`${T.danger}10`, border:`1px solid ${T.danger}33`, borderRadius:8, padding:'8px', color:T.danger, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Icon n="trash" size={13} color={T.danger}/> Eliminar nodo
          </button>
        </div>
      )}
    </div>
  )
}

export default function FlowsPage() {
  const { mode } = useTheme()
  const T = getTheme(mode)
  const [nodes, setNodes]     = useState(INIT_NODES)
  const [edges, setEdges]     = useState(INIT_EDGES)
  const [selNode, setSelNode] = useState(null)
  const [selEdge, setSelEdge] = useState(null)
  const [pan, setPan]         = useState({ x:40, y:20 })
  const [zoom, setZoom]       = useState(0.85)
  const [drag, setDrag]       = useState(null)
  const [conn, setConn]       = useState(null)
  const [mouse, setMouse]     = useState({ x:0, y:0 })
  const [panning, setPanning] = useState(null)
  const [panel, setPanel]     = useState('editor')
  const svgRef = useRef()

  const toast = useStore ? null : null
  const showToast = (msg) => { /* handled by store in full app */ }

  const svgPt = e => { const s=svgRef.current; if(!s) return {x:0,y:0}; const p=s.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(s.getScreenCTM().inverse()) }
  const onDragStart = useCallback((e,id)=>{ if(conn) return; const p=svgPt(e); const n=nodes.find(n=>n.id===id); setDrag({id,ox:p.x-n.x,oy:p.y-n.y}) },[conn,nodes])
  const onMMove = useCallback(e=>{ const p=svgPt(e); setMouse(p); if(drag) setNodes(prev=>prev.map(n=>n.id===drag.id?{...n,x:p.x-drag.ox,y:p.y-drag.oy}:n)) },[drag])
  const onMUp  = useCallback(()=>{ setDrag(null); if(conn) setConn(null) },[conn])

  const onCvsDown  = e => { if(e.target===svgRef.current||e.target.tagName==='svg') { setSelNode(null); setSelEdge(null); setPanning({sx:e.clientX-pan.x,sy:e.clientY-pan.y}) } }
  const onCvsMMove = e => { if(panning) setPan({x:e.clientX-panning.sx,y:e.clientY-panning.sy}); onMMove(e) }
  const onCvsMUp   = () => { setPanning(null); onMUp() }
  const onWheel    = e => { e.preventDefault(); setZoom(z=>Math.max(0.2,Math.min(2.5,z-e.deltaY*0.001))) }

  const onPortDown = (id,port) => setConn({nodeId:id,port})
  const onPortUp   = (id,port) => {
    if(conn&&conn.nodeId!==id&&port==='in') {
      if(!edges.find(e=>e.from===conn.nodeId&&e.fromPort===conn.port&&e.to===id))
        setEdges(p=>[...p,{id:`e-${Date.now()}`,from:conn.nodeId,fromPort:conn.port,to:id,toPort:'in'}])
    }
    setConn(null)
  }

  const addNode = type => {
    const id=`n-${Date.now()}`
    const defs={message:{text:'Nuevo mensaje...'},options:{text:'Elegí una opción:',options:['Opción 1','Opción 2']},input:{question:'¿Cuál es tu nombre?',variable:'nombre'},delay:{seconds:5,message:'Un momento...'},agent:{message:'Un agente te atenderá pronto.',team:'any'},condition:{variable:'',operator:'equals',value:''},end:{label:'Fin de flujo'}}
    setNodes(p=>[...p,{id,type,x:380-pan.x/zoom,y:240-pan.y/zoom,data:defs[type]||{}}])
    setSelNode(id)
  }
  const updNode = (id,data) => setNodes(p=>p.map(n=>n.id===id?{...n,data}:n))
  const delNode = id => { setNodes(p=>p.filter(n=>n.id!==id)); setEdges(p=>p.filter(e=>e.from!==id&&e.to!==id)); setSelNode(null) }
  const delEdge = id => { setEdges(p=>p.filter(e=>e.id!==id)); setSelEdge(null) }

  const eColor = edge => getNT(nodes.find(n=>n.id===edge.from)?.type||'message', mode).color
  const selectedNode = nodes.find(n=>n.id===selNode)

  const btn = (onClick, children, style={}) => (
    <button onClick={onClick} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 8px', color:T.textMuted, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, boxShadow:T.shadow, ...style }}>
      {children}
    </button>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:T.bg, overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{ height:50, background:T.bgCard, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 14px', gap:8, flexShrink:0, boxShadow:T.shadow }}>
        <span style={{ color:T.textMuted, fontSize:12, marginRight:4 }}>Agregar:</span>
        {PALETTE.map(([type,t])=>{
          const nt = getNT(type, mode)
          return (
            <button key={type} onClick={()=>addNode(type)}
              style={{ background:nt.bg, border:`1px solid ${nt.border}`, borderRadius:7, padding:'4px 10px', color:nt.color, fontSize:11, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <Icon n={nt.icon} size={12} color={nt.color}/>{t.label}
            </button>
          )
        })}
        <div style={{ flex:1 }}/>
        {btn(()=>setZoom(z=>Math.max(0.2,z-0.1)), <Icon n="zoomOut" size={13} color={T.textMuted}/>)}
        <span style={{ color:T.textMuted, fontSize:11, minWidth:36, textAlign:'center' }}>{Math.round(zoom*100)}%</span>
        {btn(()=>setZoom(z=>Math.min(2.5,z+0.1)), <Icon n="zoomIn" size={13} color={T.textMuted}/>)}
        {btn(()=>{ setZoom(0.85); setPan({x:40,y:20}) }, <Icon n="reset" size={13} color={T.textMuted}/>)}
        <div style={{ width:1, height:20, background:T.border, margin:'0 4px' }}/>
        <div style={{ display:'flex', background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:8, overflow:'hidden' }}>
          {[['editor','pencil','Editor'],['preview','play','Preview']].map(([p,ic,lb])=>(
            <button key={p} onClick={()=>setPanel(p)}
              style={{ padding:'5px 11px', background:panel===p?T.primary:'transparent', border:'none', color:panel===p?'#fff':T.textMuted, fontSize:11, cursor:'pointer', fontWeight:panel===p?700:400, display:'flex', alignItems:'center', gap:5, transition:'all 0.15s' }}>
              <Icon n={ic} size={12} color={panel===p?'#fff':T.textMuted}/>{lb}
            </button>
          ))}
        </div>
        <button onClick={()=>{}}
          style={{ background:T.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:`0 2px 8px ${T.primary}44` }}>
          <Icon n="save" size={13} color="#fff"/> Guardar
        </button>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Canvas */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', cursor:panning?'grabbing':'default' }}
          onMouseDown={onCvsDown} onMouseMove={onCvsMMove} onMouseUp={onCvsMUp} onWheel={onWheel}>
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
            <defs>
              <pattern id="dots" width={22*zoom} height={22*zoom} patternUnits="userSpaceOnUse" x={pan.x%(22*zoom)} y={pan.y%(22*zoom)}>
                <circle cx={1} cy={1} r={0.7} fill={mode==='light'?'#CBD5E1':'#334155'} opacity={0.8}/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
          <svg ref={svgRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} onMouseMove={onMMove} onMouseUp={onMUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {edges.map(edge=>{
                const fn=nodes.find(n=>n.id===edge.from), tn=nodes.find(n=>n.id===edge.to)
                if(!fn||!tn) return null
                return <EdgePath key={edge.id} from={getPortPos(fn,edge.fromPort)} to={getPortPos(tn,edge.toPort)} color={eColor(edge)} selected={selEdge===edge.id} onClick={()=>{ setSelEdge(edge.id); setSelNode(null) }}/>
              })}
              {conn && (()=>{ const fn=nodes.find(n=>n.id===conn.nodeId); return fn?<EdgePath from={getPortPos(fn,conn.port)} to={mouse} color={T.accent} selected/>:null })()}
              {nodes.map(node=>(
                <FlowNode key={node.id} node={node} selected={selNode===node.id} mode={mode}
                  onSelect={setSelNode} onDragStart={onDragStart} onPortDown={onPortDown} onPortUp={onPortUp} connecting={conn}/>
              ))}
            </g>
          </svg>
          {selEdge && (
            <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:'8px 14px', display:'flex', gap:10, alignItems:'center', boxShadow:T.shadowMd }}>
              <span style={{ color:T.textMuted, fontSize:12 }}>Conexión seleccionada</span>
              <button onClick={()=>delEdge(selEdge)} style={{ background:`${T.danger}10`, border:`1px solid ${T.danger}33`, borderRadius:6, padding:'4px 10px', color:T.danger, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Icon n="trash" size={12} color={T.danger}/> Eliminar
              </button>
              <button onClick={()=>setSelEdge(null)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <Icon n="x" size={12} color={T.textMuted}/>
              </button>
            </div>
          )}
          <div style={{ position:'absolute', bottom:16, right:16, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:'5px 12px', color:T.textFaint, fontSize:10.5, display:'flex', alignItems:'center', gap:6, boxShadow:T.shadow }}>
            <Icon n="link" size={11} color={T.textFaint}/> {nodes.length} nodos · {edges.length} conexiones
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:280, background:T.bgCard, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          <NodeEditor node={selectedNode} onChange={updNode} onDelete={delNode} onClose={()=>setSelNode(null)} mode={mode}/>
        </div>
      </div>
    </div>
  )
}
