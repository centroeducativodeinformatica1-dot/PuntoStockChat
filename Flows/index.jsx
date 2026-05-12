import { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

// ─── Node type definitions ────────────────────────────────────────────────────
const NODE_META = {
  trigger:   { label:'Disparador',    icon:'zap',     color:'#F59E0B' },
  message:   { label:'Mensaje',       icon:'message',  color:'#2563EB' },
  options:   { label:'Opciones',      icon:'shuffle',  color:'#10B981' },
  condition: { label:'Condición',     icon:'help',     color:'#F97316' },
  input:     { label:'Pedir dato',    icon:'editPen',  color:'#8B5CF6' },
  delay:     { label:'Espera',        icon:'clock',    color:'#EF4444' },
  agent:     { label:'Agente humano', icon:'user',     color:'#0EA5E9' },
  end:       { label:'Fin',           icon:'flag',     color:'#64748B' },
}
const PALETTE = Object.entries(NODE_META).filter(([k]) => k !== 'trigger' && k !== 'end')

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
const getNodeH = n => n.type === 'options' ? 62 + (n.data.options?.length || 0) * 30 + 16 : 82
const getPortPos = (node, port) => {
  const h = getNodeH(node)
  if (port === 'in')  return { x: node.x,         y: node.y + h / 2 }
  if (port === 'out') return { x: node.x + NODE_W, y: node.y + h / 2 }
  if (port.startsWith('opt-')) {
    const i = parseInt(port.split('-')[1])
    return { x: node.x + NODE_W, y: node.y + 60 + i * 30 + 11 }
  }
  return { x: node.x + NODE_W, y: node.y + h / 2 }
}

// ─── Edge ─────────────────────────────────────────────────────────────────────
function EdgePath({ from, to, color, selected, onClick }) {
  const dx = Math.max(Math.abs(to.x - from.x) * 0.5, 60)
  const d = `M${from.x},${from.y} C${from.x+dx},${from.y} ${to.x-dx},${to.y} ${to.x},${to.y}`
  return (
    <g onClick={onClick} style={{ cursor:'pointer' }}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={14}/>
      <path d={d} fill="none" stroke={selected ? color : color + '99'} strokeWidth={selected ? 2.5 : 1.8}
        style={{ filter: selected ? `drop-shadow(0 0 4px ${color})` : 'none', transition:'stroke 0.15s' }}/>
      <circle cx={to.x} cy={to.y} r={4} fill={color}/>
    </g>
  )
}

// Inline SVG icons for use inside SVG canvas
const CANVAS_ICONS = {
  zap:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  shuffle: <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></>,
  help:    <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  editPen: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  user:    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  flag:    <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
}
function CanvasIcon({ n, x, y, size = 14, color }) {
  const s = size / 24
  return (
    <g transform={`translate(${x - size/2},${y - size/2}) scale(${s})`}>
      <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {CANVAS_ICONS[n]}
      </svg>
    </g>
  )
}

// ─── Flow Node ────────────────────────────────────────────────────────────────
function FlowNode({ node, selected, onSelect, onDragStart, onPortDown, onPortUp, connecting, mode }) {
  const T    = getTheme(mode)
  const meta = NODE_META[node.type] || NODE_META.message
  const h    = getNodeH(node)
  const isTarget = connecting && connecting.nodeId !== node.id

  // Colors per mode
  const nodeBg     = mode === 'light' ? '#FFFFFF' : '#1E293B'
  const nodeBorder = selected ? meta.color : isTarget ? T.accent : (mode === 'light' ? '#E2E8F0' : '#334155')
  const headerBg   = meta.color + (mode === 'light' ? '15' : '22')
  const textColor  = mode === 'light' ? '#0F172A' : '#F1F5F9'
  const mutedColor = mode === 'light' ? '#64748B' : '#94A3B8'
  const portBg     = mode === 'light' ? '#FFFFFF' : '#1E293B'

  const outPorts = node.type === 'options'
    ? (node.data.options || []).map((_, i) => `opt-${i}`)
    : node.type !== 'end' ? ['out'] : []

  return (
    <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'grab', userSelect:'none' }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e, node.id); onSelect(node.id) }}>
      {selected && <rect x={-4} y={-4} width={NODE_W+8} height={h+8} rx={14} fill={meta.color + '14'}/>}
      <rect x={0} y={0} width={NODE_W} height={h} rx={12} fill={nodeBg}
        stroke={nodeBorder} strokeWidth={selected ? 2 : 1}
        style={{ filter: selected ? `drop-shadow(0 0 8px ${meta.color}44)` : `drop-shadow(0 1px 3px rgba(0,0,0,0.08))`, transition:'all 0.15s' }}/>
      <rect x={0} y={0} width={NODE_W} height={32} rx={12} fill={headerBg}/>
      <rect x={0} y={20} width={NODE_W} height={12} fill={headerBg}/>
      <CanvasIcon n={meta.icon} x={18} y={16} size={13} color={meta.color}/>
      <text x={32} y={21} fontSize={11.5} fill={meta.color} fontWeight={700} fontFamily="system-ui">{meta.label}</text>

      {(node.type === 'message' || node.type === 'input' || node.type === 'agent') && (
        <foreignObject x={8} y={36} width={NODE_W-16} height={38}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:10.5, color:mutedColor, lineHeight:1.45, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {node.data.text || node.data.question || node.data.message}
          </div>
        </foreignObject>
      )}
      {(node.type === 'trigger' || node.type === 'end') &&
        <text x={10} y={55} fontSize={10.5} fill={mutedColor} fontFamily="system-ui">{node.data.label}</text>}
      {node.type === 'delay' &&
        <text x={10} y={55} fontSize={10.5} fill={mutedColor} fontFamily="system-ui">Espera: {node.data.seconds}s</text>}
      {node.type === 'options' && (
        <>
          <text x={10} y={55} fontSize={10.5} fill={mutedColor} fontFamily="system-ui">{node.data.text}</text>
          {(node.data.options || []).map((opt, i) => (
            <g key={i}>
              <rect x={8} y={60+i*30} width={NODE_W-16} height={22} rx={6} fill={meta.color+'18'} stroke={meta.color+'44'} strokeWidth={0.8}/>
              <text x={15} y={75+i*30} fontSize={9.5} fill={meta.color} fontFamily="system-ui" fontWeight={600}>
                {opt.length > 24 ? opt.slice(0,24)+'…' : opt}
              </text>
            </g>
          ))}
        </>
      )}

      {/* IN port */}
      {node.type !== 'trigger' && (
        <g onMouseUp={e => { e.stopPropagation(); onPortUp(node.id, 'in') }}>
          <circle cx={0} cy={h/2} r={9} fill="transparent" style={{ cursor:'crosshair' }}/>
          <circle cx={0} cy={h/2} r={6} fill={portBg} stroke={isTarget ? T.accent : nodeBorder} strokeWidth={1.5}
            style={{ filter: isTarget ? `drop-shadow(0 0 4px ${T.accent})` : 'none' }}/>
          <circle cx={0} cy={h/2} r={3} fill={isTarget ? T.accent : mutedColor}/>
        </g>
      )}
      {/* OUT ports */}
      {outPorts.map(port => {
        const py = port === 'out' ? h/2 : 60 + parseInt(port.split('-')[1]) * 30 + 11
        return (
          <g key={port} onMouseDown={e => { e.stopPropagation(); onPortDown(node.id, port) }}>
            <circle cx={NODE_W} cy={py} r={10} fill="transparent" style={{ cursor:'crosshair' }}/>
            <circle cx={NODE_W} cy={py} r={6} fill={portBg} stroke={meta.color} strokeWidth={1.5}/>
            <circle cx={NODE_W} cy={py} r={3} fill={meta.color}/>
          </g>
        )
      })}
    </g>
  )
}

// ─── Node Editor — inputs defined OUTSIDE to prevent focus loss ───────────────
function NodeEditorInner({ node, onChangeData, onDelete, onClose, mode }) {
  const T    = getTheme(mode)
  const meta = NODE_META[node.type] || NODE_META.message

  const iSt = {
    width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8,
    padding:'8px 10px', color:T.text, fontSize:12.5, outline:'none',
    fontFamily:'system-ui', boxSizing:'border-box',
  }
  const taSt = { ...iSt, resize:'vertical', lineHeight:1.5 }

  const setField = (k, v) => onChangeData(node.id, { ...node.data, [k]: v })
  const setOption = (i, v) => {
    const opts = [...(node.data.options || [])]
    opts[i] = v
    onChangeData(node.id, { ...node.data, options: opts })
  }
  const addOption = () => onChangeData(node.id, { ...node.data, options: [...(node.data.options || []), 'Nueva opción'] })
  const delOption = i => {
    const opts = [...(node.data.options || [])]
    opts.splice(i, 1)
    onChangeData(node.id, { ...node.data, options: opts })
  }

  const lbStyle = { color:T.textFaint, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', display:'block', marginBottom:5 }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:meta.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon n={meta.icon} size={15} color={meta.color}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:meta.color, fontSize:10.5, fontWeight:700, letterSpacing:0.5 }}>{meta.label.toUpperCase()}</div>
          <div style={{ color:T.textFaint, fontSize:9.5 }}>id: {node.id}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}>
          <Icon n="x" size={15} color={T.textFaint}/>
        </button>
      </div>

      {/* Fields */}
      <div style={{ flex:1, overflowY:'auto', padding:14 }}>

        {node.type === 'message' && (
          <div style={{ marginBottom:14 }}>
            <label style={lbStyle}>Texto del mensaje</label>
            <textarea value={node.data.text || ''} onChange={e => setField('text', e.target.value)} style={{ ...taSt }} rows={4} placeholder="Escribí el mensaje..."/>
          </div>
        )}

        {node.type === 'options' && (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Texto introductorio</label>
              <input value={node.data.text || ''} onChange={e => setField('text', e.target.value)} style={iSt}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Botones</label>
              {(node.data.options || []).map((opt, i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:meta.color, flexShrink:0 }}/>
                  <input value={opt} onChange={e => setOption(i, e.target.value)} style={{ ...iSt, flex:1 }}/>
                  <button onClick={() => delOption(i)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', padding:2 }}>
                    <Icon n="x" size={13} color={T.danger}/>
                  </button>
                </div>
              ))}
              <button onClick={addOption} style={{ width:'100%', background:meta.color+'12', border:`1px dashed ${meta.color}55`, borderRadius:8, padding:'7px', color:meta.color, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
                <Icon n="plus" size={13} color={meta.color}/> Agregar botón
              </button>
            </div>
          </>
        )}

        {node.type === 'trigger' && (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Nombre</label>
              <input value={node.data.label || ''} onChange={e => setField('label', e.target.value)} style={iSt}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Evento disparador</label>
              <select value={node.data.trigger || 'page_visit'} onChange={e => setField('trigger', e.target.value)} style={{ ...iSt, appearance:'none' }}>
                <option value="page_visit">Primera visita</option>
                <option value="return_visit">Visita recurrente</option>
                <option value="exit_intent">Intención de salida</option>
                <option value="cart_abandon">Carrito abandonado</option>
                <option value="manual">Manual / API</option>
              </select>
            </div>
          </>
        )}

        {node.type === 'input' && (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Pregunta</label>
              <textarea value={node.data.question || ''} onChange={e => setField('question', e.target.value)} style={{ ...taSt }} rows={3}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Guardar en variable</label>
              <input value={node.data.variable || ''} onChange={e => setField('variable', e.target.value)} style={iSt} placeholder="nombre, email..."/>
            </div>
          </>
        )}

        {node.type === 'delay' && (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Tiempo de espera: {node.data.seconds || 0}s</label>
              <input type="range" min={1} max={120} value={node.data.seconds || 5} onChange={e => setField('seconds', +e.target.value)} style={{ width:'100%' }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Mensaje mientras espera</label>
              <input value={node.data.message || ''} onChange={e => setField('message', e.target.value)} style={iSt} placeholder="Un momento..."/>
            </div>
          </>
        )}

        {node.type === 'agent' && (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Mensaje de transferencia</label>
              <textarea value={node.data.message || ''} onChange={e => setField('message', e.target.value)} style={{ ...taSt }} rows={3}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbStyle}>Equipo</label>
              <select value={node.data.team || 'any'} onChange={e => setField('team', e.target.value)} style={{ ...iSt, appearance:'none' }}>
                <option value="any">Cualquier agente</option>
                <option value="sales">Ventas</option>
                <option value="support">Soporte</option>
              </select>
            </div>
          </>
        )}

        {node.type === 'end' && (
          <div style={{ marginBottom:14 }}>
            <label style={lbStyle}>Etiqueta</label>
            <input value={node.data.label || ''} onChange={e => setField('label', e.target.value)} style={iSt}/>
          </div>
        )}
      </div>

      {/* Delete */}
      {node.type !== 'trigger' && (
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
          <button onClick={() => onDelete(node.id)} style={{ width:'100%', background:`${T.danger}10`, border:`1px solid ${T.danger}33`, borderRadius:8, padding:'8px', color:T.danger, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Icon n="trash" size={13} color={T.danger}/> Eliminar nodo
          </button>
        </div>
      )}
    </div>
  )
}

function NodeEditorPanel({ nodeId, nodes, onChangeData, onDelete, mode }) {
  const T    = getTheme(mode)
  const node = nodes.find(n => n.id === nodeId)

  if (!node) return (
    <div style={{ padding:24, textAlign:'center', marginTop:50 }}>
      <Icon n="nodes" size={28} color={T.textFaint} style={{ margin:'0 auto 12px' }}/>
      <div style={{ color:T.textFaint, fontSize:12.5, lineHeight:1.7 }}>
        Hacé click en un nodo para editarlo.<br/>
        Arrastrá el punto <strong style={{ color:T.text }}>●</strong> derecho hacia el punto izquierdo para conectar.
      </div>
    </div>
  )

  return (
    <NodeEditorInner
      key={node.id}
      node={node}
      onChangeData={onChangeData}
      onDelete={onDelete}
      onClose={() => {}}
      mode={mode}
    />
  )
}

// ─── Main Flows Page ──────────────────────────────────────────────────────────
export default function FlowsPage() {
  const { mode } = useTheme()
  const T        = getTheme(mode)

  const [nodes,    setNodes]    = useState(INIT_NODES)
  const [edges,    setEdges]    = useState(INIT_EDGES)
  const [selNode,  setSelNode]  = useState(null)
  const [selEdge,  setSelEdge]  = useState(null)
  const [pan,      setPan]      = useState({ x:40, y:20 })
  const [zoom,     setZoom]     = useState(0.85)
  const [drag,     setDrag]     = useState(null)
  const [conn,     setConn]     = useState(null)
  const [mouse,    setMouse]    = useState({ x:0, y:0 })
  const [panning,  setPanning]  = useState(null)
  const [toast,    setToast]    = useState(null)
  const svgRef = useRef()

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const svgPt = e => {
    const s = svgRef.current; if (!s) return { x:0, y:0 }
    const p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    return p.matrixTransform(s.getScreenCTM().inverse())
  }

  const onDragStart = useCallback((e, id) => {
    if (conn) return
    const p = svgPt(e)
    const n = nodes.find(n => n.id === id)
    setDrag({ id, ox: p.x - n.x, oy: p.y - n.y })
  }, [conn, nodes])

  const onMouseMove = useCallback(e => {
    const p = svgPt(e)
    setMouse(p)
    if (drag) setNodes(prev => prev.map(n => n.id === drag.id ? { ...n, x: p.x - drag.ox, y: p.y - drag.oy } : n))
  }, [drag])

  const onMouseUp = useCallback(() => { setDrag(null); if (conn) setConn(null) }, [conn])

  const onCvsDown  = e => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      setSelNode(null); setSelEdge(null)
      setPanning({ sx: e.clientX - pan.x, sy: e.clientY - pan.y })
    }
  }
  const onCvsMove  = e => { if (panning) setPan({ x: e.clientX - panning.sx, y: e.clientY - panning.sy }); onMouseMove(e) }
  const onCvsUp    = () => { setPanning(null); onMouseUp() }
  const onWheel    = e => { e.preventDefault(); setZoom(z => Math.max(0.2, Math.min(2.5, z - e.deltaY * 0.001))) }

  const onPortDown = (id, port) => setConn({ nodeId: id, port })
  const onPortUp   = (id, port) => {
    if (conn && conn.nodeId !== id && port === 'in') {
      if (!edges.find(e => e.from === conn.nodeId && e.fromPort === conn.port && e.to === id)) {
        setEdges(p => [...p, { id:`e-${Date.now()}`, from:conn.nodeId, fromPort:conn.port, to:id, toPort:'in' }])
        showToast('Conexión creada')
      }
    }
    setConn(null)
  }

  const addNode = type => {
    const id = `n-${Date.now()}`
    const defs = {
      message:   { text:'Nuevo mensaje...' },
      options:   { text:'Elegí una opción:', options:['Opción 1','Opción 2'] },
      input:     { question:'¿Cuál es tu nombre?', variable:'nombre' },
      delay:     { seconds:5, message:'Un momento...' },
      agent:     { message:'Un agente te atenderá pronto.', team:'any' },
      condition: { variable:'', operator:'equals', value:'' },
      end:       { label:'Fin de flujo' },
    }
    setNodes(p => [...p, { id, type, x:380 - pan.x/zoom, y:240 - pan.y/zoom, data: defs[type] || {} }])
    setSelNode(id)
    showToast(`Nodo "${NODE_META[type].label}" agregado`)
  }

  // Key: use functional update so we never close over stale nodes
  const changeNodeData = useCallback((id, data) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data } : n))
  }, [])

  const deleteNode = id => {
    setNodes(p => p.filter(n => n.id !== id))
    setEdges(p => p.filter(e => e.from !== id && e.to !== id))
    setSelNode(null)
    showToast('Nodo eliminado')
  }
  const deleteEdge = id => { setEdges(p => p.filter(e => e.id !== id)); setSelEdge(null) }

  const eColor = edge => NODE_META[nodes.find(n => n.id === edge.from)?.type]?.color || T.primary

  const iconBtn = (onClick, iconName, title) => (
    <button onClick={onClick} title={title}
      style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center', boxShadow:T.shadow }}>
      <Icon n={iconName} size={14} color={T.textMuted}/>
    </button>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:T.bg, overflow:'hidden' }}>

      {/* Toolbar */}
      <div style={{ height:50, background:T.bgCard, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 14px', gap:6, flexShrink:0, boxShadow:T.shadow }}>
        <span style={{ color:T.textMuted, fontSize:12, marginRight:4, whiteSpace:'nowrap' }}>+ Nodo:</span>
        <div style={{ display:'flex', gap:4, overflowX:'auto', flex:1 }}>
          {PALETTE.map(([type, meta]) => (
            <button key={type} onClick={() => addNode(type)}
              style={{ background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:7, padding:'4px 10px', color:meta.color, fontSize:11, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap', flexShrink:0 }}>
              <Icon n={meta.icon} size={12} color={meta.color}/>{meta.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
          {iconBtn(() => setZoom(z => Math.max(0.2, z-0.1)), 'zoomOut', 'Alejar')}
          <span style={{ color:T.textMuted, fontSize:11, minWidth:36, textAlign:'center' }}>{Math.round(zoom*100)}%</span>
          {iconBtn(() => setZoom(z => Math.min(2.5, z+0.1)), 'zoomIn', 'Acercar')}
          {iconBtn(() => { setZoom(0.85); setPan({x:40,y:20}) }, 'reset', 'Reset')}
          <div style={{ width:1, height:20, background:T.border, margin:'0 4px' }}/>
          <button onClick={() => showToast('Flujo guardado')}
            style={{ background:T.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Icon n="save" size={13} color="#fff"/> Guardar
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Canvas */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', cursor:panning?'grabbing':'default' }}
          onMouseDown={onCvsDown} onMouseMove={onCvsMove} onMouseUp={onCvsUp} onWheel={onWheel}>

          {/* Dot grid */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
            <defs>
              <pattern id="flowdots" width={22*zoom} height={22*zoom} patternUnits="userSpaceOnUse" x={pan.x%(22*zoom)} y={pan.y%(22*zoom)}>
                <circle cx={1} cy={1} r={0.8} fill={mode==='light'?'#CBD5E1':'#334155'} opacity={0.8}/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#flowdots)"/>
          </svg>

          <svg ref={svgRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}
            onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map(edge => {
                const fn = nodes.find(n => n.id === edge.from)
                const tn = nodes.find(n => n.id === edge.to)
                if (!fn || !tn) return null
                return <EdgePath key={edge.id}
                  from={getPortPos(fn, edge.fromPort)} to={getPortPos(tn, edge.toPort)}
                  color={eColor(edge)} selected={selEdge === edge.id}
                  onClick={() => { setSelEdge(edge.id); setSelNode(null) }}/>
              })}

              {/* Live connection line */}
              {conn && (() => {
                const fn = nodes.find(n => n.id === conn.nodeId)
                return fn ? <EdgePath from={getPortPos(fn, conn.port)} to={mouse} color={T.accent} selected/> : null
              })()}

              {/* Nodes */}
              {nodes.map(node => (
                <FlowNode key={node.id} node={node} selected={selNode === node.id} mode={mode}
                  onSelect={setSelNode} onDragStart={onDragStart}
                  onPortDown={onPortDown} onPortUp={onPortUp} connecting={conn}/>
              ))}
            </g>
          </svg>

          {/* Edge delete toolbar */}
          {selEdge && (
            <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:'8px 14px', display:'flex', gap:10, alignItems:'center', boxShadow:T.shadowMd }}>
              <span style={{ color:T.textMuted, fontSize:12 }}>Conexión seleccionada</span>
              <button onClick={() => deleteEdge(selEdge)} style={{ background:`${T.danger}10`, border:`1px solid ${T.danger}33`, borderRadius:6, padding:'4px 10px', color:T.danger, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Icon n="trash" size={12} color={T.danger}/> Eliminar
              </button>
              <button onClick={() => setSelEdge(null)} style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <Icon n="x" size={12} color={T.textMuted}/>
              </button>
            </div>
          )}

          {/* Info pill */}
          <div style={{ position:'absolute', bottom:16, right:16, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:'5px 12px', color:T.textFaint, fontSize:10.5, display:'flex', alignItems:'center', gap:6, boxShadow:T.shadow }}>
            <Icon n="link" size={11} color={T.textFaint}/> {nodes.length} nodos · {edges.length} conexiones
          </div>
        </div>

        {/* Right panel — editor */}
        <div style={{ width:280, background:T.bgCard, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
          <NodeEditorPanel
            nodeId={selNode}
            nodes={nodes}
            onChangeData={changeNodeData}
            onDelete={deleteNode}
            mode={mode}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:T.primary, color:'#fff', borderRadius:10, padding:'8px 18px', fontSize:12, fontWeight:600, zIndex:9999, pointerEvents:'none', boxShadow:T.shadowLg }}>
          {toast}
        </div>
      )}
    </div>
  )
}
