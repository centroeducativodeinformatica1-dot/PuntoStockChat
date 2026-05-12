import { useStore } from '../../store'
import { useAuth } from '../Auth'
import { AgentStatusPicker } from '../AgentStatus'
import { Icon } from '../Icon'

const NAV = [
  { id: 'conversations', icon: 'messages', label: 'Chats'      },
  { id: 'agents',        icon: 'users',    label: 'Agentes'    },
  { id: 'flows',         icon: 'shuffle',  label: 'Flujos'     },
  { id: 'widget',        icon: 'widget',   label: 'Widget'     },
  { id: 'settings',      icon: 'settings', label: 'Config'     },
]

export function Layout({ children }) {
  const section    = useStore(s => s.sidebarSection)
  const setSection = useStore(s => s.setSidebarSection)
  const toast      = useStore(s => s.toast)
  const agentDoc   = useStore(s => s.agentDoc)
  const { user, logout } = useAuth()

  const TOAST_COLORS = { success:'#00D9B5', error:'#FF4D4D', info:'#6C47FF' }

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0B0A14', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width:64, background:'#13111F', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:2, flexShrink:0, zIndex:20 }}>
        {/* Logo */}
        <div style={{ width:36, height:36, borderRadius:10, background:'#6C47FF', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <Icon n="zap" size={18} color="#fff"/>
        </div>

        {/* Nav items */}
        {NAV.map(item => (
          <button key={item.id} onClick={() => setSection(item.id)} title={item.label}
            style={{ width:44, height:44, borderRadius:10, background:section===item.id?'rgba(108,71,255,0.18)':'transparent', border:section===item.id?'1px solid rgba(108,71,255,0.4)':'1px solid transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', position:'relative' }}>
            <Icon n={item.icon} size={20} color={section===item.id?'#6C47FF':'#45425A'}/>
            {/* Unread badge for conversations */}
            {item.id==='conversations' && <UnreadBadge/>}
          </button>
        ))}

        <div style={{ flex:1 }}/>

        {/* User avatar */}
        {user?.photoURL
          ? <img src={user.photoURL} style={{ width:34, height:34, borderRadius:'50%', border:'2px solid rgba(108,71,255,0.5)', cursor:'pointer' }} title={user.email}/>
          : <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(108,71,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon n="user" size={16} color="#6C47FF"/>
            </div>
        }
        <button onClick={logout} title="Cerrar sesión"
          style={{ width:34, height:34, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginTop:6 }}>
          <Icon n="logOut" size={15} color="#45425A"/>
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Top bar */}
        <div style={{ height:52, background:'#13111F', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
          <div style={{ color:'#EDEAF8', fontWeight:700, fontSize:15 }}>{NAV.find(n=>n.id===section)?.label}</div>
          <div style={{ flex:1 }}/>
          <AgentStatusPicker/>
          <div style={{ color:'#45425A', fontSize:12 }}>{agentDoc?.name || user?.displayName}</div>
        </div>

        {/* Page */}
        <div style={{ flex:1, overflow:'hidden' }}>
          {children}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:TOAST_COLORS[toast.type]||'#6C47FF', color:'#fff', borderRadius:12, padding:'10px 22px', fontSize:13, fontWeight:700, boxShadow:'0 6px 30px rgba(0,0,0,0.4)', zIndex:9999, pointerEvents:'none', display:'flex', alignItems:'center', gap:8 }}>
          <Icon n={toast.type==='error'?'x':'check'} size={14} color="#fff"/>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function UnreadBadge() {
  const conversations = useStore(s => s.conversations)
  const count = conversations.filter(c => c.unread > 0).length
  if (!count) return null
  return (
    <div style={{ position:'absolute', top:6, right:6, width:16, height:16, borderRadius:'50%', background:'#FF4D4D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', border:'2px solid #13111F' }}>
      {count > 9 ? '9+' : count}
    </div>
  )
}
