// El constructor visual de flujos completo se incluye aquí.
// Por brevedad usamos un placeholder que podés reemplazar con el componente
// chatflow-builder.jsx que generamos antes.

export default function FlowsPage() {
  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'#45425A' }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#45425A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
      </svg>
      <div style={{ fontSize:15, fontWeight:700, color:'#7A7690' }}>Constructor de flujos</div>
      <div style={{ fontSize:12, color:'#45425A', textAlign:'center', maxWidth:300, lineHeight:1.6 }}>
        Reemplazá este archivo con el componente <code style={{ color:'#6C47FF' }}>chatflow-builder.jsx</code> para tener el editor visual completo de flujos.
      </div>
    </div>
  )
}
