import { useState, useRef, useCallback, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

// ─── Node types ───────────────────────────────────────────────────────────────
const NODE_META = {
  trigger:   { label:'Disparador',      icon:'zap',      color:'#F59E0B', desc:'Cuándo inicia el flujo' },
  message:   { label:'Mensaje',         icon:'message',  color:'#2563EB', desc:'Enviar texto al visitante' },
  options:   { label:'Botones',         icon:'shuffle',  color:'#10B981', desc:'El visitante elige una opción' },
  input:     { label:'Pedir dato',      icon:'editPen',  color:'#8B5CF6', desc:'Guardar respuesta en variable' },
  condition: { label:'Condición',       icon:'help',     color:'#F97316', desc:'Bifurcar según variable o agente' },
  agent:     { label:'Agente humano',   icon:'user',     color:'#0EA5E9', desc:'Derivar a agente disponible' },
  whatsapp:  { label:'WhatsApp',        icon:'phone',    color:'#25D366', desc:'Botón de WhatsApp como fallback' },
  delay:     { label:'Espera',          icon:'clock',    color:'#EF4444', desc:'Pausa antes del próximo paso' },
  end:       { label:'Fin',             icon:'flag',     color:'#64748B', desc:'Terminar el flujo' },
}

const PALETTE = Object.entries(NODE_META).filter(([k]) => !['trigger','end'].includes(k))

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = {
  bienvenida: {
    name: '👋 Bienvenida',
    nodes: [
      { id:'n1', type:'trigger',  x:40,  y:200, data:{ label:'Primera visita', trigger:'page_visit' } },
      { id:'n2', type:'input',    x:280, y:200, data:{ question:'¡Hola! ¿Cómo te llamás?', variable:'nombre', inputType:'text' } },
      { id:'n3', type:'message',  x:520, y:200, data:{ text:'¡Bienvenido/a {{nombre}}! ¿En qué puedo ayudarte hoy?' } },
      { id:'n4', type:'options',  x:760, y:140, data:{ text:'Elegí una opción:', options:['Ver productos','Soporte','Precios','Hablar con un agente'] } },
      { id:'n5', type:'condition',x:1020, y:140, data:{ condType:'agent', agentMsg:'Un agente está disponible, te conecto ahora.', noAgentMsg:'No hay agentes disponibles en este momento.' } },
      { id:'n6', type:'agent',    x:1260, y:60,  data:{ message:'Conectando con un agente... {{nombre}}, en un momento te atienden.' } },
      { id:'n7', type:'whatsapp', x:1260, y:240, data:{ message:'Hola, soy {{nombre}} y necesito ayuda con PuntoStock.', phone:'5491112345678', buttonText:'Contactar por WhatsApp' } },
    ],
    edges: [
      { id:'e1', from:'n1', fromPort:'out',   to:'n2', toPort:'in' },
      { id:'e2', from:'n2', fromPort:'out',   to:'n3', toPort:'in' },
      { id:'e3', from:'n3', fromPort:'out',   to:'n4', toPort:'in' },
      { id:'e4', from:'n4', fromPort:'opt-3', to:'n5', toPort:'in' },
      { id:'e5', from:'n5', fromPort:'yes',   to:'n6', toPort:'in' },
      { id:'e6', from:'n5', fromPort:'no',    to:'n7', toPort:'in' },
    ]
  },
  soporte: {
    name: '🛠️ Soporte técnico',
    nodes: [
      { id:'n1', type:'trigger',  x:40,  y:200, data:{ label:'Página de soporte', trigger:'page_visit' } },
      { id:'n2', type:'message',  x:280, y:200, data:{ text:'Hola, estás en Soporte Técnico. Voy a ayudarte a resolver tu problema.' } },
      { id:'n3', type:'input',    x:520, y:200, data:{ question:'¿Cuál es tu nombre?', variable:'nombre', inputType:'text' } },
      { id:'n4', type:'input',    x:760, y:200, data:{ question:'{{nombre}}, describí brevemente tu problema:', variable:'problema', inputType:'text' } },
      { id:'n5', type:'condition',x:1000, y:200, data:{ condType:'agent', agentMsg:'Perfecto, te conectamos con un agente ahora.', noAgentMsg:'No hay agentes disponibles ahora.' } },
      { id:'n6', type:'agent',    x:1240, y:100, data:{ message:'{{nombre}} necesita soporte: {{problema}}' } },
      { id:'n7', type:'whatsapp', x:1240, y:300, data:{ message:'Hola! Soy {{nombre}} y tengo este problema: {{problema}}', phone:'5491112345678', buttonText:'Continuar por WhatsApp' } },
    ],
    edges: [
      { id:'e1', from:'n1', fromPort:'out', to:'n2', toPort:'in' },
      { id:'e2', from:'n2', fromPort:'out', to:'n3', toPort:'in' },
      { id:'e3', from:'n3', fromPort:'out', to:'n4', toPort:'in' },
      { id:'e4', from:'n4', fromPort:'out', to:'n5', toPort:'in' },
      { id:'e5', from:'n5', fromPort:'yes', to:'n6', toPort:'in' },
      { id:'e6', from:'n5', fromPort:'no',  to:'n7', toPort:'in' },
    ]
  },
  ventas: {
    name: '💰 Ventas',
    nodes: [
      { id:'n1', type:'trigger',  x:40,  y:200, data:{ label:'Carrito abandonado', trigger:'cart_abandon' } },
      { id:'n2', type:'message',  x:280, y:200, data:{ text:'¡Hola! Vimos que dejaste algo en tu carrito. ¿Podemos ayudarte a completar tu compra?' } },
      { id:'n3', type:'options',  x:520, y:200, data:{ text:'¿Qué necesitás?', options:['Tengo una duda','Quiero un descuento','Hablar con ventas','No gracias'] } },
      { id:'n4', type:'input',    x:760, y:80,  data:{ question:'¿Cuál es tu duda? Te respondo enseguida.', variable:'duda', inputType:'text' } },
      { id:'n5', type:'message',  x:760, y:240, data:{ text:'¡Tenemos un 10% de descuento para vos! Usá el código: VUELVE10' } },
      { id:'n6', type:'condition',x:760, y:380, data:{ condType:'agent', agentMsg:'Te conecto con el equipo de ventas.', noAgentMsg:'Nuestro equipo no está disponible ahora.' } },
      { id:'n7', type:'agent',    x:1000, y:300, data:{ message:'Cliente interesado en comprar. Consulta: {{duda}}' } },
      { id:'n8', type:'whatsapp', x:1000, y:460, data:{ message:'Hola! Quiero hablar con ventas sobre mi compra.', phone:'5491112345678', buttonText:'Hablar con ventas por WhatsApp' } },
      { id:'n9', type:'end',      x:760, y:530, data:{ label:'Sin interés' } },
    ],
    edges: [
      { id:'e1', from:'n1', fromPort:'out',   to:'n2', toPort:'in' },
      { id:'e2', from:'n2', fromPort:'out',   to:'n3', toPort:'in' },
      { id:'e3', from:'n3', fromPort:'opt-0', to:'n4', toPort:'in' },
      { id:'e4', from:'n3', fromPort:'opt-1', to:'n5', toPort:'in' },
      { id:'e5', from:'n3', fromPort:'opt-2', to:'n6', toPort:'in' },
      { id:'e6', from:'n3', fromPort:'opt-3', to:'n9', toPort:'in' },
      { id:'e7', from:'n6', fromPort:'yes',   to:'n7', toPort:'in' },
      { id:'e8', from:'n6', fromPort:'no',    to:'n8', toPort:'in' },
    ]
  }
}

const INIT_NODES = TEMPLATES.bienvenida.nodes
const INIT_EDGES = TEMPLATES.bienvenida.edges

// ─── Geometry ─────────────────────────────────────────────────────────────────
const NW = 210
const getH = n => {
  if (n.type === 'options')   return 60 + (n.data.options?.length||0)*28+12
  if (n.type === 'condition') return 110
  if (n.type === 'whatsapp')  return 100
  return 82
}

const pp = (node, port) => {
  const h = getH(node)
  if (port==='in')    return { x:node.x,      y:node.y+h/2 }
  if (port==='out')   return { x:node.x+NW,   y:node.y+h/2 }
  if (port==='yes')   return { x:node.x+NW,   y:node.y+36 }
  if (port==='no')    return { x:node.x+NW,   y:node.y+72 }
  if (port.startsWith('opt-')) {
    const i=parseInt(port.split('-')[1])
    return { x:node.x+NW, y:node.y+54+i*28+10 }
  }
  return { x:node.x+NW, y:node.y+h/2 }
}

// ─── SVG Icons for canvas ─────────────────────────────────────────────────────
const SVGI = {
  zap:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  shuffle: <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></>,
  help:    <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  editPen: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  user:    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  phone:   <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.37 2 2 0 0 1 3.6 2.18L6.4 2a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
  flag:    <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
}
function SI({ n, cx, cy, size=13, color }) {
  const s=size/24
  return <g transform={`translate(${cx-size/2},${cy-size/2}) scale(${s})`}><svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">{SVGI[n]}</svg></g>
}

// ─── Edge ─────────────────────────────────────────────────────────────────────
function Bezier({ from, to, color, thick, label, onClick }) {
  const dx=Math.max(Math.abs(to.x-from.x)*0.55,50)
  const d=`M${from.x},${from.y} C${from.x+dx},${from.y} ${to.x-dx},${to.y} ${to.x},${to.y}`
  const mx=(from.x+to.x)/2, my=(from.y+to.y)/2
  return (
    <g onClick={onClick} style={{cursor:onClick?'pointer':'default'}}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={14}/>
      <path d={d} fill="none" stroke={color} strokeWidth={thick?2.5:1.8} opacity={thick?1:0.75}
        style={{filter:thick?`drop-shadow(0 0 3px ${color})`:'none'}}/>
      <circle cx={to.x} cy={to.y} r={3.5} fill={color}/>
      {label && <><rect x={mx-18} y={my-9} width={36} height={18} rx={9} fill={color}/><text x={mx} y={my+4.5} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700} fontFamily="system-ui">{label}</text></>}
    </g>
  )
}

// ─── Flow Node ────────────────────────────────────────────────────────────────
function FlowNode({ node, selected, mode, onMD, onPD, onPU, isCT }) {
  const meta=NODE_META[node.type]||NODE_META.message
  const h=getH(node)
  const L=mode==='light'
  const bg=L?'#FFF':'#1E293B'
  const bd=selected?meta.color:isCT?'#0EA5E9':(L?'#E2E8F0':'#334155')
  const mu=L?'#64748B':'#94A3B8'
  const sh=selected?`drop-shadow(0 0 8px ${meta.color}55)`:`drop-shadow(0 1px 4px rgba(0,0,0,${L?0.1:0.3}))`

  // OUT ports per type
  const outPorts = node.type==='options'
    ? (node.data.options||[]).map((_,i)=>`opt-${i}`)
    : node.type==='condition' ? ['yes','no']
    : node.type!=='end' ? ['out'] : []

  return (
    <g transform={`translate(${node.x},${node.y})`} style={{cursor:'grab',userSelect:'none'}}
      onMouseDown={e=>{e.stopPropagation();onMD(e)}}>
      {selected&&<rect x={-4} y={-4} width={NW+8} height={h+8} rx={14} fill={meta.color+'14'}/>}
      <rect x={0} y={0} width={NW} height={h} rx={12} fill={bg} stroke={bd} strokeWidth={selected?2:1}
        style={{filter:sh,transition:'all 0.15s'}}/>
      <rect x={0} y={0} width={NW} height={30} rx={12} fill={meta.color+'22'}/>
      <rect x={0} y={18} width={NW} height={12} fill={meta.color+'22'}/>
      <SI n={meta.icon} cx={17} cy={15} size={13} color={meta.color}/>
      <text x={31} y={20} fontSize={11} fill={meta.color} fontWeight={700} fontFamily="system-ui">{meta.label}</text>

      {/* Body content */}
      {(node.type==='message')&&(
        <foreignObject x={8} y={34} width={NW-16} height={40}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
            {node.data.text||'Sin texto'}
          </div>
        </foreignObject>
      )}
      {node.type==='trigger'&&<text x={10} y={54} fontSize={10} fill={mu} fontFamily="system-ui">{node.data.label}</text>}
      {node.type==='end'&&<text x={10} y={54} fontSize={10} fill={mu} fontFamily="system-ui">{node.data.label}</text>}
      {node.type==='delay'&&<text x={10} y={54} fontSize={10} fill={mu} fontFamily="system-ui">Espera: {node.data.seconds||5}s</text>}
      {node.type==='input'&&(
        <foreignObject x={8} y={34} width={NW-16} height={40}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
            {node.data.question||'Sin pregunta'}
            {node.data.variable&&<span style={{color:meta.color}}> → {'{{'}{node.data.variable}{'}}'}</span>}
          </div>
        </foreignObject>
      )}
      {node.type==='agent'&&(
        <foreignObject x={8} y={34} width={NW-16} height={40}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
            {node.data.message||'Sin mensaje'}
          </div>
        </foreignObject>
      )}
      {node.type==='whatsapp'&&(
        <>
          <text x={10} y={50} fontSize={10} fill={mu} fontFamily="system-ui">📱 {node.data.phone||'Sin número'}</text>
          <foreignObject x={8} y={56} width={NW-16} height={36}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:9,color:meta.color,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
              {node.data.buttonText||'Contactar por WhatsApp'}
            </div>
          </foreignObject>
        </>
      )}
      {node.type==='condition'&&(
        <>
          <text x={10} y={52} fontSize={10} fill={mu} fontFamily="system-ui">
            {node.data.condType==='agent'?'¿Hay agente disponible?':'Condición'}
          </text>
          <rect x={8} y={58} width={80} height={18} rx={4} fill='#10B98122'/>
          <text x={12} y={70} fontSize={9} fill='#10B981' fontWeight={700} fontFamily="system-ui">✓ SÍ → agente</text>
          <rect x={8} y={80} width={80} height={18} rx={4} fill='#EF444422'/>
          <text x={12} y={93} fontSize={9} fill='#EF4444' fontWeight={700} fontFamily="system-ui">✗ NO → fallback</text>
        </>
      )}
      {node.type==='options'&&(
        <>
          <text x={10} y={52} fontSize={10} fill={mu} fontFamily="system-ui">{node.data.text}</text>
          {(node.data.options||[]).map((opt,i)=>(
            <g key={i}>
              <rect x={8} y={54+i*28} width={NW-16} height={20} rx={5} fill={meta.color+'18'} stroke={meta.color+'44'} strokeWidth={0.8}/>
              <text x={14} y={68+i*28} fontSize={9} fill={meta.color} fontFamily="system-ui" fontWeight={600}>
                {opt.length>26?opt.slice(0,26)+'…':opt}
              </text>
            </g>
          ))}
        </>
      )}

      {/* IN port */}
      {node.type!=='trigger'&&(
        <g onMouseUp={e=>{e.stopPropagation();onPU('in')}}>
          <circle cx={0} cy={h/2} r={9} fill="transparent" style={{cursor:'crosshair'}}/>
          <circle cx={0} cy={h/2} r={5.5} fill={bg} stroke={isCT?'#0EA5E9':bd} strokeWidth={1.5}
            style={{filter:isCT?`drop-shadow(0 0 4px #0EA5E9)`:'none'}}/>
          <circle cx={0} cy={h/2} r={2.5} fill={isCT?'#0EA5E9':mu}/>
        </g>
      )}

      {/* OUT ports */}
      {outPorts.map(port=>{
        const pos = pp(node, port)
        const py = pos.y - node.y
        const portColor = port==='yes'?'#10B981':port==='no'?'#EF4444':meta.color
        return (
          <g key={port} onMouseDown={e=>{e.stopPropagation();onPD(port)}}>
            <circle cx={NW} cy={py} r={9} fill="transparent" style={{cursor:'crosshair'}}/>
            <circle cx={NW} cy={py} r={5.5} fill={bg} stroke={portColor} strokeWidth={1.5}/>
            <circle cx={NW} cy={py} r={2.5} fill={portColor}/>
            {(port==='yes'||port==='no')&&(
              <text x={NW+8} y={py+4} fontSize={9} fill={portColor} fontWeight={700} fontFamily="system-ui">
                {port==='yes'?'SÍ':'NO'}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ─── Resolve variables in text ─────────────────────────────────────────────────
function resolveVars(text, vars) {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`)
}

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({ nodes, edges, primaryColor }) {
  const [msgs, setMsgs]     = useState([])
  const [input, setInput]   = useState('')
  const [curId, setCurId]   = useState(null)
  const [vars, setVars]     = useState({})
  const [started, setStarted] = useState(false)
  const [agentsOnline, setAgentsOnline] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs])

  // Check real agent status
  useEffect(() => {
    try {
      const q = query(collection(db,'agents'), where('status','==','online'))
      return onSnapshot(q, snap => setAgentsOnline(snap.docs.length > 0))
    } catch { return () => {} }
  }, [])

  const trigger = nodes.find(n=>n.type==='trigger')
  const getNext = (id, port='out') =>
    edges.filter(e=>e.from===id&&e.fromPort===port).map(e=>nodes.find(n=>n.id===e.to)).filter(Boolean)

  const appendMsg = (from, text, extra={}) => {
    setMsgs(p=>[...p,{from,text:resolveVars(text,vars),id:Date.now()+Math.random(),...extra}])
  }

  const runNode = useCallback((id, currentVars) => {
    const node = nodes.find(n=>n.id===id)
    if (!node) return
    setTimeout(()=>{
      if (node.type==='message') {
        setMsgs(p=>[...p,{from:'bot',text:resolveVars(node.data.text||'',currentVars),id:Date.now()+Math.random()}])
        const nx=getNext(id); if(nx[0]) runNode(nx[0].id, currentVars)
      } else if (node.type==='options') {
        setMsgs(p=>[...p,{from:'bot',text:resolveVars(node.data.text||'',currentVars),options:node.data.options,nodeId:id,id:Date.now()+Math.random()}])
        setCurId(id)
      } else if (node.type==='input') {
        setMsgs(p=>[...p,{from:'bot',text:resolveVars(node.data.question||'',currentVars),awaitInput:true,nodeId:id,varName:node.data.variable,id:Date.now()+Math.random()}])
        setCurId(id)
      } else if (node.type==='delay') {
        setMsgs(p=>[...p,{from:'bot',text:'...',typing:true,id:Date.now()+Math.random()}])
        setTimeout(()=>{ const nx=getNext(id); if(nx[0]) runNode(nx[0].id,currentVars) },(node.data.seconds||3)*300)
      } else if (node.type==='agent') {
        setMsgs(p=>[...p,{from:'bot',text:resolveVars(node.data.message||'',currentVars),agentCard:true,id:Date.now()+Math.random()}])
        setCurId(null)
      } else if (node.type==='condition') {
        // Check if agent available
        const port = agentsOnline ? 'yes' : 'no'
        const msg  = agentsOnline ? node.data.agentMsg : node.data.noAgentMsg
        if (msg) setMsgs(p=>[...p,{from:'bot',text:resolveVars(msg,currentVars),id:Date.now()+Math.random()}])
        const nx=getNext(id,port); if(nx[0]) runNode(nx[0].id,currentVars)
      } else if (node.type==='whatsapp') {
        const phone = node.data.phone||'5491112345678'
        const waText = encodeURIComponent(resolveVars(node.data.message||'Hola!',currentVars))
        setMsgs(p=>[...p,{from:'bot',text:'No hay agentes disponibles ahora.',waBtn:{phone,text:waText,label:node.data.buttonText||'Contactar por WhatsApp'},id:Date.now()+Math.random()}])
        setCurId(null)
      } else if (node.type==='end') {
        setMsgs(p=>[...p,{from:'sys',text:'— Conversación finalizada —',id:Date.now()+Math.random()}])
        setCurId(null)
      }
    }, 700)
  }, [nodes, edges, agentsOnline])

  const start = () => {
    setMsgs([]); setVars({}); setStarted(true); setCurId(null)
    if (!trigger) return
    const nx=getNext(trigger.id)
    if(nx[0]) runNode(nx[0].id,{})
  }

  const handleOption = (optIdx, nodeId) => {
    const node=nodes.find(n=>n.id===nodeId)
    const opt=node?.data.options?.[optIdx]
    if(!opt) return
    setMsgs(p=>[...p,{from:'user',text:opt,id:Date.now()}])
    setCurId(null)
    const nx=getNext(nodeId,`opt-${optIdx}`)
    if(nx[0]) runNode(nx[0].id,vars)
  }

  const handleSend = () => {
    if(!input.trim()) return
    const cur=curId
    const curNode=nodes.find(n=>n.id===cur)
    const newVars={...vars}
    if(curNode?.type==='input'&&curNode.data.variable) newVars[curNode.data.variable]=input.trim()
    setVars(newVars)
    setMsgs(p=>[...p,{from:'user',text:input,id:Date.now()}])
    setInput(''); setCurId(null)
    if(cur){ const nx=getNext(cur); if(nx[0]) runNode(nx[0].id,newVars) }
  }

  const PC = primaryColor||'#2563EB'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#F8FAFC',fontFamily:'system-ui'}}>
      {/* Header */}
      <div style={{padding:'10px 14px',background:PC,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon n="message" size={14} color="#fff"/>
        </div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:13}}>Preview del flujo</div>
          <div style={{color:'rgba(255,255,255,0.65)',fontSize:10,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:agentsOnline?'#4ade80':'#fbbf24'}}/>
            {agentsOnline?'Agente disponible':'Sin agentes en línea'} (real)
          </div>
        </div>
        <button onClick={start} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,padding:'5px 10px',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
          {started?<Icon n="refreshCw" size={11} color="#fff"/>:<Icon n="play" size={11} color="#fff"/>}
          {started?'Reiniciar':'Probar'}
        </button>
      </div>

      {/* Variables strip */}
      {Object.keys(vars).length>0&&(
        <div style={{padding:'6px 12px',background:'#EFF6FF',borderBottom:'1px solid #BFDBFE',display:'flex',gap:6,flexWrap:'wrap'}}>
          {Object.entries(vars).map(([k,v])=>(
            <span key={k} style={{background:'#2563EB',color:'#fff',borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:600}}>
              {'{{'}{k}{'}}'}={v}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 10px',display:'flex',flexDirection:'column',gap:8}}>
        {!started&&(
          <div style={{textAlign:'center',marginTop:40,color:'#94a3b8',fontSize:12}}>
            <Icon n="play" size={26} color="#cbd5e1" style={{margin:'0 auto 10px'}}/>
            Presioná "Probar" para simular el flujo en tiempo real
          </div>
        )}
        {msgs.map(m=>(
          <div key={m.id}>
            {m.from==='sys'&&<div style={{textAlign:'center',color:'#94a3b8',fontSize:10,padding:'2px 0'}}>{m.text}</div>}
            {m.from==='bot'&&(
              <div style={{display:'flex',gap:7,alignItems:'flex-end'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:PC,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon n="message" size={12} color="#fff"/>
                </div>
                <div>
                  <div style={{background:'#fff',borderRadius:'10px 10px 10px 2px',padding:'8px 12px',fontSize:12,color:'#1e293b',maxWidth:210,boxShadow:'0 1px 3px rgba(0,0,0,0.07)',lineHeight:1.45}}>
                    {m.typing?<span style={{color:'#cbd5e1'}}>...</span>:m.text}
                    {m.agentCard&&(
                      <div style={{marginTop:7,background:'#EFF6FF',borderRadius:8,padding:'6px 10px',display:'flex',alignItems:'center',gap:7,border:'1px solid #BFDBFE'}}>
                        <Icon n="user" size={13} color={PC}/>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:'#1e293b'}}>Agente en camino</div>
                          <div style={{fontSize:9,color:'#64748b'}}>Espera un momento</div>
                        </div>
                      </div>
                    )}
                    {m.waBtn&&(
                      <a href={`https://wa.me/${m.waBtn.phone}?text=${m.waBtn.text}`} target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:7,marginTop:7,background:'#25D366',borderRadius:8,padding:'7px 10px',textDecoration:'none',cursor:'pointer'}}>
                        <Icon n="phone" size={13} color="#fff"/>
                        <span style={{color:'#fff',fontSize:10,fontWeight:700}}>{m.waBtn.label}</span>
                      </a>
                    )}
                  </div>
                  {m.options&&(
                    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:6}}>
                      {m.options.map((opt,i)=>(
                        <button key={i} onClick={()=>handleOption(i,m.nodeId)}
                          style={{background:'#fff',border:`1.5px solid ${PC}`,borderRadius:16,padding:'4px 11px',fontSize:10.5,color:PC,cursor:'pointer',fontWeight:600}}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {m.from==='user'&&(
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <div style={{background:PC,borderRadius:'10px 10px 2px 10px',padding:'8px 12px',fontSize:12,color:'#fff',maxWidth:200,lineHeight:1.45}}>{m.text}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'7px 10px',borderTop:'1px solid #e2e8f0',display:'flex',gap:6,background:'#fff',flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}
          placeholder="Escribí una respuesta..."
          style={{flex:1,border:'1px solid #e2e8f0',borderRadius:18,padding:'7px 12px',fontSize:12,outline:'none',fontFamily:'system-ui',color:'#1e293b'}}/>
        <button onClick={handleSend} style={{background:PC,border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon n="send" size={13} color="#fff"/>
        </button>
      </div>
    </div>
  )
}

// ─── Main Flow Page ────────────────────────────────────────────────────────────
export default function FlowsPage() {
  const {mode}=useTheme()
  const T=getTheme(mode)

  const [nodes,     setNodes]     = useState(INIT_NODES)
  const [edges,     setEdges]     = useState(INIT_EDGES)
  const [selNode,   setSelNode]   = useState(null)
  const [selEdge,   setSelEdge]   = useState(null)
  const [pan,       setPan]       = useState({x:20,y:20})
  const [zoom,      setZoom]      = useState(0.72)
  const [drag,      setDrag]      = useState(null)
  const [conn,      setConn]      = useState(null)
  const [mouse,     setMouse]     = useState({x:0,y:0})
  const [panning,   setPanning]   = useState(null)
  const [toast,     setToast]     = useState('')
  const [panel,     setPanel]     = useState('editor')  // editor | preview
  const [showTpl,   setShowTpl]   = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const svgRef=useRef()

  const flash=t=>{setToast(t);setTimeout(()=>setToast(''),2200)}
  const toSvg=e=>{const s=svgRef.current;if(!s)return{x:0,y:0};const p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(s.getScreenCTM().inverse())}

  const onCvsDown=e=>{if(e.target===svgRef.current||e.target.tagName==='svg'){setSelNode(null);setSelEdge(null);setPanning({sx:e.clientX-pan.x,sy:e.clientY-pan.y})}}
  const onCvsMove=e=>{const p=toSvg(e);setMouse(p);if(panning)setPan({x:e.clientX-panning.sx,y:e.clientY-panning.sy});if(drag)setNodes(prev=>prev.map(n=>n.id===drag.id?{...n,x:p.x-drag.ox,y:p.y-drag.oy}:n))}
  const onCvsUp=()=>{setPanning(null);setDrag(null);if(conn)setConn(null)}
  const onWheel=e=>{e.preventDefault();setZoom(z=>Math.max(0.2,Math.min(2.5,z-e.deltaY*0.001)))}

  const startDrag=(e,id)=>{if(conn)return;const p=toSvg(e);const n=nodes.find(n=>n.id===id);setDrag({id,ox:p.x-n.x,oy:p.y-n.y})}
  const startConn=(nodeId,port)=>setConn({nodeId,port})
  const finishConn=(nodeId,port)=>{
    if(!conn||conn.nodeId===nodeId||port!=='in'){setConn(null);return}
    if(!edges.find(e=>e.from===conn.nodeId&&e.fromPort===conn.port&&e.to===nodeId)){
      setEdges(p=>[...p,{id:`e-${Date.now()}`,from:conn.nodeId,fromPort:conn.port,to:nodeId,toPort:'in'}])
      flash('Conexión creada ✓')
    }
    setConn(null)
  }

  const addNode=type=>{
    const id=`n-${Date.now()}`
    const defs={
      message:   {text:'Nuevo mensaje... Podés usar {{nombre}} para personalizar.'},
      options:   {text:'Elegí una opción:',options:['Opción 1','Opción 2']},
      input:     {question:'¿Cómo te llamás?',variable:'nombre',inputType:'text'},
      delay:     {seconds:3,message:''},
      agent:     {message:'Un agente te atenderá. Gracias {{nombre}}.'},
      condition: {condType:'agent',agentMsg:'Hay un agente disponible.',noAgentMsg:'No hay agentes en este momento.'},
      whatsapp:  {phone:'5491112345678',message:'Hola! Soy {{nombre}} y necesito ayuda.',buttonText:'Contactar por WhatsApp'},
      end:       {label:'Fin de flujo'},
    }
    setNodes(p=>[...p,{id,type,x:Math.round(380-pan.x/zoom),y:Math.round(220-pan.y/zoom),data:defs[type]||{}}])
    setSelNode(id);flash(`"${NODE_META[type].label}" agregado`)
  }

  const updateNode=useCallback((id,data)=>setNodes(prev=>prev.map(n=>n.id===id?{...n,data}:n)),[])
  const deleteNode=id=>{setNodes(p=>p.filter(n=>n.id!==id));setEdges(p=>p.filter(e=>e.from!==id&&e.to!==id));setSelNode(null);flash('Nodo eliminado')}
  const deleteEdge=id=>{setEdges(p=>p.filter(e=>e.id!==id));setSelEdge(null)}

  const loadTemplate=key=>{
    const tpl=TEMPLATES[key];if(!tpl)return
    setNodes(tpl.nodes);setEdges(tpl.edges);setSelNode(null);setShowTpl(false)
    flash(`Template "${tpl.name}" cargado`)
  }

  const eColor=edge=>{
    const fn=nodes.find(n=>n.id===edge.from)
    if(!fn) return T.primary
    if(edge.fromPort==='yes') return '#10B981'
    if(edge.fromPort==='no')  return '#EF4444'
    return NODE_META[fn.type]?.color||T.primary
  }

  const eLabel=edge=>{
    if(edge.fromPort==='yes') return 'SÍ'
    if(edge.fromPort==='no')  return 'NO'
    if(edge.fromPort?.startsWith('opt-')){
      const fn=nodes.find(n=>n.id===edge.from)
      const i=parseInt(edge.fromPort.split('-')[1])
      return fn?.data?.options?.[i]?.slice(0,8)||null
    }
    return null
  }

  const selN=nodes.find(n=>n.id===selNode)
  const meta=selN?NODE_META[selN.type]:null

  // Editor field helpers
  const base={width:'100%',background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px',color:T.text,fontSize:13,outline:'none',fontFamily:'system-ui',boxSizing:'border-box',display:'block',marginBottom:10}
  const lbl={color:T.textFaint,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',display:'block',marginBottom:5}
  const setF=(k,v)=>selN&&updateNode(selN.id,{...selN.data,[k]:v})
  const setO=(i,v)=>{if(!selN)return;const o=[...(selN.data.options||[])];o[i]=v;updateNode(selN.id,{...selN.data,options:o})}
  const addO=()=>selN&&updateNode(selN.id,{...selN.data,options:[...(selN.data.options||[]),'Nueva opción']})
  const rmO=i=>{if(!selN)return;const o=[...(selN.data.options||[])];o.splice(i,1);updateNode(selN.id,{...selN.data,options:o})}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:T.bg,overflow:'hidden'}}>

      {/* Toolbar */}
      <div style={{height:50,background:T.bgCard,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 12px',gap:6,flexShrink:0}}>
        {/* Templates */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowTpl(s=>!s)}
            style={{background:T.primary,border:'none',borderRadius:8,padding:'5px 12px',color:'#fff',fontSize:11.5,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            <Icon n="zap" size={13} color="#fff"/> Templates
          </button>
          {showTpl&&(
            <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,width:200,zIndex:100,boxShadow:T.shadowLg,overflow:'hidden'}}>
              {Object.entries(TEMPLATES).map(([key,tpl])=>(
                <button key={key} onClick={()=>loadTemplate(key)}
                  style={{width:'100%',padding:'10px 14px',background:'transparent',border:'none',color:T.text,fontSize:12.5,cursor:'pointer',textAlign:'left',display:'block',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgHover}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  {tpl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{width:1,height:22,background:T.border}}/>

        {/* Node palette */}
        <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>+ Nodo:</span>
        <div style={{display:'flex',gap:4,flex:1,overflowX:'auto'}}>
          {PALETTE.map(([type,meta])=>(
            <button key={type} onClick={()=>addNode(type)}
              style={{background:'transparent',border:`1px solid ${meta.color}55`,borderRadius:7,padding:'4px 9px',color:meta.color,fontSize:10.5,cursor:'pointer',fontWeight:700,whiteSpace:'nowrap',flexShrink:0,transition:'background 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background=meta.color+'18'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {meta.label}
            </button>
          ))}
        </div>

        <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
          <button onClick={()=>setZoom(z=>Math.max(0.2,z-0.1))} style={{background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,cursor:'pointer',color:T.textMuted,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
          <span style={{color:T.textMuted,fontSize:11,minWidth:36,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(2.5,z+0.1))} style={{background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,cursor:'pointer',color:T.textMuted,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          <button onClick={()=>{setZoom(0.72);setPan({x:20,y:20})}} style={{background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,cursor:'pointer',color:T.textMuted,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>↩</button>

          <div style={{width:1,height:22,background:T.border}}/>

          {/* Panel toggle */}
          <div style={{display:'flex',background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden'}}>
            {[['editor','pencil','Editor'],['preview','eye','Preview']].map(([p,ic,lb])=>(
              <button key={p} onClick={()=>setPanel(p)}
                style={{padding:'5px 10px',background:panel===p?T.primary:'transparent',border:'none',color:panel===p?'#fff':T.textMuted,fontSize:10.5,cursor:'pointer',fontWeight:panel===p?700:400,display:'flex',alignItems:'center',gap:4,transition:'all 0.15s'}}>
                <Icon n={ic} size={12} color={panel===p?'#fff':T.textMuted}/>{lb}
              </button>
            ))}
          </div>

          <button onClick={()=>flash('Flujo guardado ✓')} style={{background:T.primary,border:'none',borderRadius:8,padding:'6px 14px',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            <Icon n="save" size={13} color="#fff"/> Guardar
          </button>
        </div>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* Canvas */}
        <div style={{flex:1,position:'relative',overflow:'hidden',cursor:panning?'grabbing':'default'}}
          onMouseDown={onCvsDown} onMouseMove={onCvsMove} onMouseUp={onCvsUp} onWheel={onWheel}>

          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
            <defs><pattern id="g2" width={20*zoom} height={20*zoom} patternUnits="userSpaceOnUse" x={pan.x%(20*zoom)} y={pan.y%(20*zoom)}>
              <circle cx={1} cy={1} r={0.7} fill={mode==='light'?'#CBD5E1':'#334155'} opacity={0.9}/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#g2)"/>
          </svg>

          <svg ref={svgRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}} onMouseMove={onCvsMove} onMouseUp={onCvsUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {edges.map(edge=>{
                const fn=nodes.find(n=>n.id===edge.from)
                const tn=nodes.find(n=>n.id===edge.to)
                if(!fn||!tn) return null
                return <Bezier key={edge.id} from={pp(fn,edge.fromPort)} to={pp(tn,edge.toPort)}
                  color={eColor(edge)} thick={selEdge===edge.id} label={eLabel(edge)}
                  onClick={()=>{setSelEdge(edge.id);setSelNode(null)}}/>
              })}
              {conn&&(()=>{const fn=nodes.find(n=>n.id===conn.nodeId);return fn?<Bezier from={pp(fn,conn.port)} to={mouse} color={T.accent} thick/>:null})()}
              {nodes.map(node=><FlowNode key={node.id} node={node} selected={selNode===node.id} mode={mode}
                isCT={!!conn&&conn.nodeId!==node.id}
                onMD={e=>{startDrag(e,node.id);setSelNode(node.id)}}
                onPD={port=>startConn(node.id,port)}
                onPU={port=>finishConn(node.id,port)}/>)}
            </g>
          </svg>

          {selEdge&&<div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:'7px 14px',display:'flex',gap:10,alignItems:'center',boxShadow:T.shadowMd}}>
            <span style={{color:T.textMuted,fontSize:12}}>Conexión seleccionada</span>
            <button onClick={()=>deleteEdge(selEdge)} style={{background:`${T.danger}12`,border:`1px solid ${T.danger}44`,borderRadius:7,padding:'4px 12px',color:T.danger,fontSize:11,cursor:'pointer',fontWeight:600}}>Eliminar</button>
            <button onClick={()=>setSelEdge(null)} style={{background:'transparent',border:`1px solid ${T.border}`,borderRadius:7,padding:'4px 8px',color:T.textMuted,fontSize:12,cursor:'pointer'}}>✕</button>
          </div>}

          <div style={{position:'absolute',bottom:14,right:14,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',color:T.textFaint,fontSize:10}}>
            {nodes.length} nodos · {edges.length} conexiones
          </div>
        </div>

        {/* Right panel */}
        <div style={{width:290,background:T.bgCard,borderLeft:`1px solid ${T.border}`,flexShrink:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>

          {panel==='preview' ? (
            <LivePreview nodes={nodes} edges={edges} primaryColor={primaryColor}/>
          ) : !selN ? (
            <div style={{padding:20,textAlign:'center',marginTop:40}}>
              <Icon n="nodes" size={28} color={T.textFaint} style={{margin:'0 auto 12px'}}/>
              <div style={{color:T.textFaint,fontSize:12.5,lineHeight:1.8}}>
                Hacé click en un nodo para editarlo.<br/>
                Arrastrá el <b style={{color:T.text}}>●</b> derecho al izquierdo para conectar nodos.
              </div>
              <div style={{marginTop:20,background:T.bgSurface,borderRadius:12,padding:14,textAlign:'left'}}>
                <div style={{color:T.text,fontSize:11,fontWeight:700,marginBottom:8}}>Variables disponibles</div>
                <div style={{color:T.textFaint,fontSize:11,lineHeight:1.8}}>
                  Usá <code style={{background:T.primaryLight,color:T.primary,padding:'1px 4px',borderRadius:4}}>{'{{'+'nombre'+'}}'}</code> en cualquier mensaje para insertar datos del visitante.<br/>
                  Las variables se crean automáticamente con el nodo <b>Pedir dato</b>.
                </div>
              </div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {/* Node header */}
              <div style={{padding:'12px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <div style={{width:28,height:28,borderRadius:8,background:meta.color+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n={meta.icon} size={14} color={meta.color}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:meta.color,fontSize:10,fontWeight:700,letterSpacing:0.6}}>{meta.label.toUpperCase()}</div>
                  <div style={{color:T.textFaint,fontSize:9.5}}>{meta.desc}</div>
                </div>
              </div>

              {/* Fields */}
              <div style={{flex:1,overflowY:'auto',padding:14}}>

                {selN.type==='message'&&<>
                  <label style={lbl}>Texto del mensaje</label>
                  <textarea style={{...base,resize:'vertical',lineHeight:1.5,minHeight:80}} rows={4}
                    value={selN.data.text||''} onChange={e=>setF('text',e.target.value)}
                    placeholder="Podés usar {{nombre}}, {{email}}, etc."/>
                  <div style={{background:T.bgSurface,borderRadius:8,padding:'8px 10px',fontSize:11,color:T.textFaint,lineHeight:1.6}}>
                    💡 Tip: Usá <code style={{color:T.primary}}>{'{{'+'variable'+'}}'}</code> para personalizar el mensaje con datos del visitante.
                  </div>
                </>}

                {selN.type==='options'&&<>
                  <label style={lbl}>Texto introductorio</label>
                  <input style={base} value={selN.data.text||''} onChange={e=>setF('text',e.target.value)}
                    placeholder="¿En qué puedo ayudarte?"/>
                  <label style={lbl}>Botones de opción</label>
                  {(selN.data.options||[]).map((opt,i)=>(
                    <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:meta.color,flexShrink:0}}/>
                      <input style={{...base,flex:1,marginBottom:0}} value={opt} onChange={e=>setO(i,e.target.value)}/>
                      <button onClick={()=>rmO(i)} style={{background:'none',border:'none',cursor:'pointer',color:T.danger,fontSize:18,lineHeight:1,padding:'0 2px'}}>×</button>
                    </div>
                  ))}
                  <button onClick={addO} style={{width:'100%',marginTop:4,marginBottom:10,background:meta.color+'15',border:`1px dashed ${meta.color}66`,borderRadius:8,padding:'7px',color:meta.color,fontSize:12,cursor:'pointer',fontWeight:600}}>
                    + Agregar botón
                  </button>
                  <div style={{background:T.bgSurface,borderRadius:8,padding:'8px 10px',fontSize:11,color:T.textFaint}}>
                    Cada botón crea una salida en el nodo que podés conectar a diferentes caminos.
                  </div>
                </>}

                {selN.type==='trigger'&&<>
                  <label style={lbl}>Nombre del disparador</label>
                  <input style={base} value={selN.data.label||''} onChange={e=>setF('label',e.target.value)}/>
                  <label style={lbl}>Evento que inicia el flujo</label>
                  <select style={{...base,appearance:'none'}} value={selN.data.trigger||'page_visit'} onChange={e=>setF('trigger',e.target.value)}>
                    <option value="page_visit">Primera visita a la página</option>
                    <option value="return_visit">Visita recurrente</option>
                    <option value="exit_intent">Intención de salida</option>
                    <option value="cart_abandon">Carrito abandonado</option>
                    <option value="scroll_50">Scroll al 50%</option>
                    <option value="manual">Manual / API</option>
                  </select>
                </>}

                {selN.type==='input'&&<>
                  <label style={lbl}>Pregunta al visitante</label>
                  <textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={3}
                    value={selN.data.question||''} onChange={e=>setF('question',e.target.value)}
                    placeholder="¿Cómo te llamás?"/>
                  <label style={lbl}>Guardar respuesta en variable</label>
                  <input style={base} placeholder="nombre, email, consulta..."
                    value={selN.data.variable||''} onChange={e=>setF('variable',e.target.value)}/>
                  <div style={{background:`${T.primary}12`,borderRadius:8,padding:'8px 10px',fontSize:11,color:T.primary,lineHeight:1.6,marginBottom:10}}>
                    La respuesta se guardará en <code>{'{{'}{selN.data.variable||'variable'}{'}}'}</code> y podrás usarla en cualquier mensaje siguiente.
                  </div>
                  <label style={lbl}>Tipo de respuesta</label>
                  <select style={{...base,appearance:'none'}} value={selN.data.inputType||'text'} onChange={e=>setF('inputType',e.target.value)}>
                    <option value="text">Texto libre</option>
                    <option value="email">Email</option>
                    <option value="phone">Teléfono</option>
                    <option value="number">Número</option>
                  </select>
                </>}

                {selN.type==='condition'&&<>
                  <label style={lbl}>Tipo de condición</label>
                  <select style={{...base,appearance:'none'}} value={selN.data.condType||'agent'} onChange={e=>setF('condType',e.target.value)}>
                    <option value="agent">¿Hay agente disponible?</option>
                    <option value="variable">Comparar variable</option>
                  </select>

                  {selN.data.condType==='agent'&&<>
                    <div style={{background:'#10B98115',border:'1px solid #10B98133',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#10B981',marginBottom:10,lineHeight:1.6}}>
                      <b>SÍ (verde)</b>: Se ejecuta cuando hay al menos un agente con estado "Disponible" en la plataforma.
                    </div>
                    <div style={{background:'#EF444415',border:'1px solid #EF444433',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#EF4444',marginBottom:10,lineHeight:1.6}}>
                      <b>NO (rojo)</b>: Se ejecuta cuando no hay agentes disponibles. Conectá aquí el nodo de WhatsApp u otro mensaje.
                    </div>
                    <label style={lbl}>Mensaje si HAY agente (opcional)</label>
                    <input style={base} placeholder="Perfecto, te conecto ahora..."
                      value={selN.data.agentMsg||''} onChange={e=>setF('agentMsg',e.target.value)}/>
                    <label style={lbl}>Mensaje si NO hay agente (opcional)</label>
                    <input style={base} placeholder="No hay agentes disponibles ahora..."
                      value={selN.data.noAgentMsg||''} onChange={e=>setF('noAgentMsg',e.target.value)}/>
                  </>}

                  {selN.data.condType==='variable'&&<>
                    <label style={lbl}>Variable a evaluar</label>
                    <input style={base} placeholder="nombre, email..." value={selN.data.variable||''} onChange={e=>setF('variable',e.target.value)}/>
                    <label style={lbl}>Operador</label>
                    <select style={{...base,appearance:'none'}} value={selN.data.operator||'exists'} onChange={e=>setF('operator',e.target.value)}>
                      <option value="exists">Existe (tiene valor)</option>
                      <option value="equals">Es igual a</option>
                      <option value="contains">Contiene</option>
                    </select>
                    {selN.data.operator!=='exists'&&<>
                      <label style={lbl}>Valor a comparar</label>
                      <input style={base} value={selN.data.value||''} onChange={e=>setF('value',e.target.value)}/>
                    </>}
                  </>}
                </>}

                {selN.type==='whatsapp'&&<>
                  <label style={lbl}>Número de WhatsApp</label>
                  <input style={base} placeholder="5491112345678 (sin + ni espacios)"
                    value={selN.data.phone||''} onChange={e=>setF('phone',e.target.value)}/>
                  <div style={{background:T.bgSurface,borderRadius:8,padding:'8px 10px',fontSize:11,color:T.textFaint,marginBottom:10}}>
                    Formato: código de país + código de área + número. Ej: <code>5491112345678</code>
                  </div>
                  <label style={lbl}>Texto del botón</label>
                  <input style={base} placeholder="Contactar por WhatsApp"
                    value={selN.data.buttonText||''} onChange={e=>setF('buttonText',e.target.value)}/>
                  <label style={lbl}>Mensaje pre-cargado en WhatsApp</label>
                  <textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={3}
                    value={selN.data.message||''} onChange={e=>setF('message',e.target.value)}
                    placeholder="Hola! Soy {{nombre}} y necesito ayuda."/>
                  <div style={{background:'#25D36615',border:'1px solid #25D36633',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#25D366',lineHeight:1.6}}>
                    💡 Podés usar <code>{'{{'+'nombre'+'}}'}</code> y otras variables en el mensaje.
                  </div>
                </>}

                {selN.type==='agent'&&<>
                  <label style={lbl}>Mensaje al derivar al agente</label>
                  <textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={3}
                    value={selN.data.message||''} onChange={e=>setF('message',e.target.value)}
                    placeholder="Un agente te atenderá. Gracias {{nombre}}."/>
                  <label style={lbl}>Asignar al equipo</label>
                  <select style={{...base,appearance:'none'}} value={selN.data.team||'any'} onChange={e=>setF('team',e.target.value)}>
                    <option value="any">Cualquier agente disponible</option>
                    <option value="sales">Ventas</option>
                    <option value="support">Soporte</option>
                    <option value="billing">Facturación</option>
                  </select>
                </>}

                {selN.type==='delay'&&<>
                  <label style={lbl}>Tiempo de espera: {selN.data.seconds||5}s</label>
                  <input type="range" min={1} max={60} style={{width:'100%',marginBottom:12}}
                    value={selN.data.seconds||5} onChange={e=>setF('seconds',+e.target.value)}/>
                  <label style={lbl}>Mensaje durante la espera (opcional)</label>
                  <input style={base} placeholder="Buscando información..."
                    value={selN.data.message||''} onChange={e=>setF('message',e.target.value)}/>
                </>}

                {selN.type==='end'&&<>
                  <label style={lbl}>Etiqueta del fin</label>
                  <input style={base} value={selN.data.label||''} onChange={e=>setF('label',e.target.value)}/>
                </>}

              </div>

              {selN.type!=='trigger'&&(
                <div style={{padding:'10px 14px',borderTop:`1px solid ${T.border}`,flexShrink:0}}>
                  <button onClick={()=>deleteNode(selN.id)} style={{width:'100%',background:`${T.danger}10`,border:`1px solid ${T.danger}33`,borderRadius:8,padding:'8px',color:T.danger,fontSize:12,cursor:'pointer',fontWeight:600}}>
                    🗑 Eliminar nodo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast&&<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',background:T.primary,color:'#fff',borderRadius:10,padding:'8px 18px',fontSize:12,fontWeight:700,zIndex:9999,pointerEvents:'none'}}>{toast}</div>}
    </div>
  )
}
