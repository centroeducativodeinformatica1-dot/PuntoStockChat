import { useState, useRef, useCallback } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon } from '../Icon'

const NODE_META = {
  trigger:   { label:'Disparador',    icon:'zap',     color:'#F59E0B' },
  message:   { label:'Mensaje',       icon:'message',  color:'#2563EB' },
  options:   { label:'Opciones',      icon:'shuffle',  color:'#10B981' },
  input:     { label:'Pedir dato',    icon:'editPen',  color:'#8B5CF6' },
  delay:     { label:'Espera',        icon:'clock',    color:'#EF4444' },
  agent:     { label:'Agente',        icon:'user',     color:'#0EA5E9' },
  end:       { label:'Fin',           icon:'flag',     color:'#64748B' },
}
const PALETTE = Object.entries(NODE_META).filter(([k]) => k !== 'trigger' && k !== 'end')
const INIT_NODES = [
  { id:'n1', type:'trigger',  x:60,  y:180, data:{ label:'Primera visita' } },
  { id:'n2', type:'message',  x:310, y:100, data:{ text:'¡Hola! ¿En qué puedo ayudarte?' } },
  { id:'n3', type:'options',  x:310, y:290, data:{ text:'Elegí una opción:', options:['Ver precios','Soporte','Agente'] } },
  { id:'n4', type:'message',  x:580, y:100, data:{ text:'Nuestros planes desde $20.000/mes.' } },
  { id:'n5', type:'agent',    x:580, y:290, data:{ message:'Un agente te atenderá pronto.' } },
  { id:'n6', type:'end',      x:840, y:190, data:{ label:'Fin' } },
]
const INIT_EDGES = [
  { id:'e1', from:'n1', fromPort:'out',   to:'n2', toPort:'in' },
  { id:'e2', from:'n1', fromPort:'out',   to:'n3', toPort:'in' },
  { id:'e3', from:'n3', fromPort:'opt-0', to:'n4', toPort:'in' },
  { id:'e4', from:'n3', fromPort:'opt-1', to:'n5', toPort:'in' },
  { id:'e5', from:'n4', fromPort:'out',   to:'n6', toPort:'in' },
  { id:'e6', from:'n5', fromPort:'out',   to:'n6', toPort:'in' },
]
const NW = 200
const getH = n => n.type === 'options' ? 58 + (n.data.options?.length || 0) * 28 + 12 : 76
const pp = (node, port) => {
  const h = getH(node)
  if (port === 'in')  return { x:node.x,    y:node.y+h/2 }
  if (port === 'out') return { x:node.x+NW, y:node.y+h/2 }
  if (port.startsWith('opt-')) { const i=parseInt(port.split('-')[1]); return { x:node.x+NW, y:node.y+54+i*28+10 } }
  return { x:node.x+NW, y:node.y+h/2 }
}

function Bez({ from, to, color, thick, onClick }) {
  const dx=Math.max(Math.abs(to.x-from.x)*0.55,50)
  const d=`M${from.x},${from.y} C${from.x+dx},${from.y} ${to.x-dx},${to.y} ${to.x},${to.y}`
  return <g onClick={onClick} style={{cursor:onClick?'pointer':'default'}}><path d={d} fill="none" stroke="transparent" strokeWidth={14}/><path d={d} fill="none" stroke={color} strokeWidth={thick?2.5:1.8} opacity={thick?1:0.7}/><circle cx={to.x} cy={to.y} r={3.5} fill={color}/></g>
}

function FlowNode({ node, selected, mode, onMD, onPD, onPU }) {
  const meta=NODE_META[node.type]||NODE_META.message
  const h=getH(node)
  const L=mode==='light'
  const bg=L?'#FFF':'#1E293B'
  const bd=selected?meta.color:(L?'#E2E8F0':'#334155')
  const mu=L?'#64748B':'#94A3B8'
  const ops=node.type==='options'?(node.data.options||[]).map((_,i)=>`opt-${i}`):node.type!=='end'?['out']:[]
  return (
    <g transform={`translate(${node.x},${node.y})`} style={{cursor:'grab',userSelect:'none'}} onMouseDown={e=>{e.stopPropagation();onMD(e)}}>
      <rect x={0} y={0} width={NW} height={h} rx={11} fill={bg} stroke={bd} strokeWidth={selected?2:1}/>
      <rect x={0} y={0} width={NW} height={30} rx={11} fill={meta.color+'20'}/>
      <rect x={0} y={18} width={NW} height={12} fill={meta.color+'20'}/>
      <text x={12} y={20} fontSize={11} fill={meta.color} fontWeight={700} fontFamily="system-ui">{meta.label}</text>
      {node.type==='message'&&<foreignObject x={8} y={34} width={NW-16} height={34}><div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{node.data.text}</div></foreignObject>}
      {(node.type==='trigger'||node.type==='end')&&<text x={10} y={52} fontSize={10} fill={mu} fontFamily="system-ui">{node.data.label}</text>}
      {node.type==='agent'&&<foreignObject x={8} y={34} width={NW-16} height={34}><div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4}}>{node.data.message}</div></foreignObject>}
      {node.type==='delay'&&<text x={10} y={52} fontSize={10} fill={mu} fontFamily="system-ui">Espera: {node.data.seconds}s</text>}
      {node.type==='input'&&<foreignObject x={8} y={34} width={NW-16} height={34}><div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:10,color:mu,lineHeight:1.4}}>{node.data.question}</div></foreignObject>}
      {node.type==='options'&&<><text x={10} y={52} fontSize={10} fill={mu} fontFamily="system-ui">{node.data.text}</text>{(node.data.options||[]).map((opt,i)=><g key={i}><rect x={8} y={54+i*28} width={NW-16} height={20} rx={5} fill={meta.color+'15'} stroke={meta.color+'44'} strokeWidth={0.8}/><text x={14} y={68+i*28} fontSize={9} fill={meta.color} fontFamily="system-ui" fontWeight={600}>{opt.length>26?opt.slice(0,26)+'…':opt}</text></g>)}</>}
      {node.type!=='trigger'&&<g onMouseUp={e=>{e.stopPropagation();onPU('in')}}><circle cx={0} cy={h/2} r={9} fill="transparent" style={{cursor:'crosshair'}}/><circle cx={0} cy={h/2} r={5.5} fill={bg} stroke={bd} strokeWidth={1.5}/><circle cx={0} cy={h/2} r={2.5} fill={mu}/></g>}
      {ops.map(port=>{const py=port==='out'?h/2:54+parseInt(port.split('-')[1])*28+10;return<g key={port} onMouseDown={e=>{e.stopPropagation();onPD(port)}}><circle cx={NW} cy={py} r={9} fill="transparent" style={{cursor:'crosshair'}}/><circle cx={NW} cy={py} r={5.5} fill={bg} stroke={meta.color} strokeWidth={1.5}/><circle cx={NW} cy={py} r={2.5} fill={meta.color}/></g>})}
    </g>
  )
}

export default function FlowsPage() {
  const { mode }=useTheme()
  const T=getTheme(mode)
  const [nodes,   setNodes]   = useState(INIT_NODES)
  const [edges,   setEdges]   = useState(INIT_EDGES)
  const [selNode, setSelNode] = useState(null)
  const [selEdge, setSelEdge] = useState(null)
  const [pan,     setPan]     = useState({x:30,y:10})
  const [zoom,    setZoom]    = useState(0.88)
  const [drag,    setDrag]    = useState(null)
  const [conn,    setConn]    = useState(null)
  const [mouse,   setMouse]   = useState({x:0,y:0})
  const [panning, setPanning] = useState(null)
  const [toast,   setToast]   = useState('')
  const svgRef=useRef()

  const flash=t=>{setToast(t);setTimeout(()=>setToast(''),2000)}
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
    const d={message:{text:'Nuevo mensaje...'},options:{text:'Elegí:',options:['Opción 1','Opción 2']},input:{question:'¿Cuál es tu nombre?',variable:'nombre'},delay:{seconds:5,message:'Un momento...'},agent:{message:'Un agente te atenderá.',team:'any'},end:{label:'Fin de flujo'}}
    setNodes(p=>[...p,{id,type,x:Math.round(350-pan.x/zoom),y:Math.round(220-pan.y/zoom),data:d[type]||{}}])
    setSelNode(id);flash(`Nodo "${NODE_META[type].label}" agregado`)
  }
  const updateNode=useCallback((id,data)=>setNodes(prev=>prev.map(n=>n.id===id?{...n,data}:n)),[])
  const deleteNode=id=>{setNodes(p=>p.filter(n=>n.id!==id));setEdges(p=>p.filter(e=>e.from!==id&&e.to!==id));setSelNode(null);flash('Nodo eliminado')}
  const deleteEdge=id=>{setEdges(p=>p.filter(e=>e.id!==id));setSelEdge(null)}
  const eColor=edge=>NODE_META[nodes.find(n=>n.id===edge.from)?.type]?.color||T.primary
  const selN=nodes.find(n=>n.id===selNode)
  const meta=selN?NODE_META[selN.type]:null
  const base={width:'100%',background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px',color:T.text,fontSize:13,outline:'none',fontFamily:'system-ui',boxSizing:'border-box',display:'block',marginBottom:12}
  const lbl={color:T.textFaint,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',display:'block',marginBottom:5}
  const setF=(k,v)=>selN&&updateNode(selN.id,{...selN.data,[k]:v})
  const setO=(i,v)=>{if(!selN)return;const o=[...(selN.data.options||[])];o[i]=v;updateNode(selN.id,{...selN.data,options:o})}
  const addO=()=>selN&&updateNode(selN.id,{...selN.data,options:[...(selN.data.options||[]),'Nueva opción']})
  const rmO=i=>{if(!selN)return;const o=[...(selN.data.options||[])];o.splice(i,1);updateNode(selN.id,{...selN.data,options:o})}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:T.bg,overflow:'hidden'}}>
      <div style={{height:48,background:T.bgCard,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 12px',gap:6,flexShrink:0}}>
        <span style={{color:T.textMuted,fontSize:11.5,flexShrink:0}}>Agregar:</span>
        <div style={{display:'flex',gap:4,flex:1,overflowX:'auto'}}>
          {PALETTE.map(([type,meta])=>(
            <button key={type} onClick={()=>addNode(type)}
              style={{background:'transparent',border:`1px solid ${meta.color}55`,borderRadius:7,padding:'4px 9px',color:meta.color,fontSize:11,cursor:'pointer',fontWeight:700,whiteSpace:'nowrap',flexShrink:0}}>
              {meta.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
          <button onClick={()=>setZoom(z=>Math.max(0.2,z-0.1))} style={{background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,cursor:'pointer',color:T.textMuted,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
          <span style={{color:T.textMuted,fontSize:11,minWidth:38,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(2.5,z+0.1))} style={{background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,cursor:'pointer',color:T.textMuted,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          <button onClick={()=>flash('Flujo guardado ✓')} style={{background:T.primary,border:'none',borderRadius:8,padding:'6px 14px',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Guardar</button>
        </div>
      </div>
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        <div style={{flex:1,position:'relative',overflow:'hidden',cursor:panning?'grabbing':'default'}}
          onMouseDown={onCvsDown} onMouseMove={onCvsMove} onMouseUp={onCvsUp} onWheel={onWheel}>
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
            <defs><pattern id="g" width={20*zoom} height={20*zoom} patternUnits="userSpaceOnUse" x={pan.x%(20*zoom)} y={pan.y%(20*zoom)}><circle cx={1} cy={1} r={0.7} fill={mode==='light'?'#CBD5E1':'#334155'} opacity={0.9}/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
          </svg>
          <svg ref={svgRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}} onMouseMove={onCvsMove} onMouseUp={onCvsUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {edges.map(edge=>{const fn=nodes.find(n=>n.id===edge.from);const tn=nodes.find(n=>n.id===edge.to);if(!fn||!tn)return null;return <Bez key={edge.id} from={pp(fn,edge.fromPort)} to={pp(tn,edge.toPort)} color={eColor(edge)} thick={selEdge===edge.id} onClick={()=>{setSelEdge(edge.id);setSelNode(null)}}/>})}
              {conn&&(()=>{const fn=nodes.find(n=>n.id===conn.nodeId);return fn?<Bez from={pp(fn,conn.port)} to={mouse} color="#0EA5E9" thick/>:null})()}
              {nodes.map(node=><FlowNode key={node.id} node={node} selected={selNode===node.id} mode={mode} onMD={e=>{startDrag(e,node.id);setSelNode(node.id)}} onPD={port=>startConn(node.id,port)} onPU={port=>finishConn(node.id,port)}/>)}
            </g>
          </svg>
          {selEdge&&<div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:'7px 14px',display:'flex',gap:10,alignItems:'center'}}>
            <span style={{color:T.textMuted,fontSize:12}}>Conexión seleccionada</span>
            <button onClick={()=>deleteEdge(selEdge)} style={{background:`${T.danger}12`,border:`1px solid ${T.danger}44`,borderRadius:7,padding:'4px 12px',color:T.danger,fontSize:11,cursor:'pointer',fontWeight:600}}>Eliminar</button>
            <button onClick={()=>setSelEdge(null)} style={{background:'transparent',border:`1px solid ${T.border}`,borderRadius:7,padding:'4px 8px',color:T.textMuted,fontSize:12,cursor:'pointer'}}>✕</button>
          </div>}
        </div>
        <div style={{width:272,background:T.bgCard,borderLeft:`1px solid ${T.border}`,flexShrink:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {!selN ? (
            <div style={{padding:24,textAlign:'center',marginTop:60}}>
              <div style={{color:T.textFaint,fontSize:13,lineHeight:1.8}}>Hacé click en un nodo para editarlo.<br/>Arrastrá el <b style={{color:T.text}}>●</b> derecho al izquierdo para conectar.</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              <div style={{padding:'12px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <div style={{width:28,height:28,borderRadius:8,background:meta.color+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n={meta.icon} size={14} color={meta.color}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:meta.color,fontSize:10,fontWeight:700,letterSpacing:0.6}}>{meta.label.toUpperCase()}</div>
                  <div style={{color:T.textFaint,fontSize:9.5}}>id: {selN.id}</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:14}}>
                {selN.type==='message'&&<><label style={lbl}>Texto del mensaje</label><textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={4} value={selN.data.text||''} onChange={e=>setF('text',e.target.value)}/></>}
                {selN.type==='options'&&<><label style={lbl}>Texto introductorio</label><input style={base} value={selN.data.text||''} onChange={e=>setF('text',e.target.value)}/><label style={lbl}>Botones</label>{(selN.data.options||[]).map((opt,i)=>(<div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}><div style={{width:6,height:6,borderRadius:'50%',background:meta.color,flexShrink:0}}/><input style={{...base,flex:1,marginBottom:0}} value={opt} onChange={e=>setO(i,e.target.value)}/><button onClick={()=>rmO(i)} style={{background:'none',border:'none',cursor:'pointer',color:T.danger,fontSize:18}}>×</button></div>))}<button onClick={addO} style={{width:'100%',marginTop:4,background:meta.color+'15',border:`1px dashed ${meta.color}66`,borderRadius:8,padding:'7px',color:meta.color,fontSize:12,cursor:'pointer',fontWeight:600}}>+ Agregar botón</button></>}
                {selN.type==='trigger'&&<><label style={lbl}>Nombre</label><input style={base} value={selN.data.label||''} onChange={e=>setF('label',e.target.value)}/><label style={lbl}>Evento</label><select style={{...base,appearance:'none'}} value={selN.data.trigger||'page_visit'} onChange={e=>setF('trigger',e.target.value)}><option value="page_visit">Primera visita</option><option value="return_visit">Visita recurrente</option><option value="manual">Manual</option></select></>}
                {selN.type==='input'&&<><label style={lbl}>Pregunta</label><textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={3} value={selN.data.question||''} onChange={e=>setF('question',e.target.value)}/><label style={lbl}>Guardar en variable</label><input style={base} placeholder="nombre, email..." value={selN.data.variable||''} onChange={e=>setF('variable',e.target.value)}/></>}
                {selN.type==='delay'&&<><label style={lbl}>Espera: {selN.data.seconds||5}s</label><input type="range" min={1} max={120} style={{width:'100%',marginBottom:12}} value={selN.data.seconds||5} onChange={e=>setF('seconds',+e.target.value)}/><label style={lbl}>Mensaje</label><input style={base} value={selN.data.message||''} onChange={e=>setF('message',e.target.value)}/></>}
                {selN.type==='agent'&&<><label style={lbl}>Mensaje de transferencia</label><textarea style={{...base,resize:'vertical',lineHeight:1.5}} rows={3} value={selN.data.message||''} onChange={e=>setF('message',e.target.value)}/><label style={lbl}>Equipo</label><select style={{...base,appearance:'none'}} value={selN.data.team||'any'} onChange={e=>setF('team',e.target.value)}><option value="any">Cualquier agente</option><option value="sales">Ventas</option><option value="support">Soporte</option></select></>}
                {selN.type==='end'&&<><label style={lbl}>Etiqueta</label><input style={base} value={selN.data.label||''} onChange={e=>setF('label',e.target.value)}/></>}
              </div>
              {selN.type!=='trigger'&&<div style={{padding:'10px 14px',borderTop:`1px solid ${T.border}`,flexShrink:0}}><button onClick={()=>deleteNode(selN.id)} style={{width:'100%',background:`${T.danger}12`,border:`1px solid ${T.danger}33`,borderRadius:8,padding:'8px',color:T.danger,fontSize:12,cursor:'pointer',fontWeight:600}}>Eliminar nodo</button></div>}
            </div>
          )}
        </div>
      </div>
      {toast&&<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',background:T.primary,color:'#fff',borderRadius:10,padding:'8px 18px',fontSize:12,fontWeight:700,zIndex:9999,pointerEvents:'none'}}>{toast}</div>}
    </div>
  )
}
