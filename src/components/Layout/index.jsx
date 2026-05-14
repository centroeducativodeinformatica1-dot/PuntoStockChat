import { useStore } from '../../store'
import { useAuth } from '../Auth'
import { AgentStatusPicker } from '../AgentStatus'
import { Icon } from '../Icon'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'

const NAV = [
  { id:'conversations', icon:'messages', label:'Chats'    },
  { id:'agents',        icon:'users',    label:'Agentes'  },
  { id:'flows',         icon:'shuffle',  label:'Flujos'   },
  { id:'widget',        icon:'widget',   label:'Widget'   },
  { id:'settings',      icon:'settings', label:'Config'   },
]

export function Layout({ children }) {
  const section    = useStore(s => s.sidebarSection)
  const setSection = useStore(s => s.setSidebarSection)
  const toast      = useStore(s => s.toast)
  const agentDoc   = useStore(s => s.agentDoc)
  const { user, logout } = useAuth()
  const { mode, toggle } = useTheme()
  const T = getTheme(mode)
  const TOAST_BG = { success:T.success, error:T.danger, info:T.primary }

  return (
    <div style={{ display:'flex', height:'100vh', background:T.bg, fontFamily:'system-ui,sans-serif', overflow:'hidden', transition:'background 0.3s' }}>
      <div style={{ width:60, background:T.bgCard, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:2, flexShrink:0, boxShadow:T.shadow }}>
        <div style={{ width:34, height:34, borderRadius:10, background:T.primary, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, boxShadow:`0 2px 8px ${T.primary}44` }}>
          <Icon n="zap" size={17} color="#fff"/>
        </div>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setSection(item.id)} title={item.label}
            style={{ width:42, height:42, borderRadius:10, background:section===item.id?T.primaryLight:'transparent', border:`1px solid ${section===item.id?T.primary+'44':'transparent'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', position:'relative' }}>
            <Icon n={item.icon} size={19} color={section===item.id?T.primary:T.textFaint}/>
            {item.id==='conversations' && <UnreadBadge T={T}/>}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <button onClick={toggle} title={mode==='light'?'Modo oscuro':'Modo claro'}
          style={{ width:34, height:34, borderRadius:8, background:T.bgSurface, border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
          <Icon n={mode==='light'?'moon':'sun'} size={16} color={T.textMuted}/>
        </button>
        {user?.photoURL
          ? <img src={user.photoURL} style={{ width:32, height:32, borderRadius:'50%', border:`2px solid ${T.primary}44` }}/>
          : <div style={{ width:32, height:32, borderRadius:'50%', background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon n="user" size={15} color={T.primary}/></div>
        }
        <button onClick={logout} title="Cerrar sesión"
          style={{ width:32, height:32, borderRadius:8, background:'transparent', border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginTop:6 }}>
          <Icon n="logOut" size={14} color={T.textFaint}/>
        </button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ height:52, background:T.bgCard, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0, boxShadow:T.shadow }}>
          <div style={{ color:T.text, fontWeight:700, fontSize:15 }}>{NAV.find(n=>n.id===section)?.label}</div>
          <div style={{ flex:1 }}/>
          <AgentStatusPicker/>
          <div style={{ width:1, height:20, background:T.border }}/>
          <div style={{ color:T.textMuted, fontSize:12.5, fontWeight:500 }}>{agentDoc?.name || user?.displayName}</div>
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>{children}</div>
      </div>
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:TOAST_BG[toast.type]||T.primary, color:'#fff', borderRadius:12, padding:'10px 22px', fontSize:13, fontWeight:600, boxShadow:T.shadowLg, zIndex:9999, pointerEvents:'none', display:'flex', alignItems:'center', gap:8 }}>
          <Icon n={toast.type==='error'?'x':'check'} size={14} color="#fff"/>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function UnreadBadge({ T }) {
  const conversations = useStore(s => s.conversations)
  const count = conversations.filter(c => c.unread > 0).length
  if (!count) return null
  return (
    <div style={{ position:'absolute', top:5, right:5, width:16, height:16, borderRadius:'50%', background:T.danger, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', border:`2px solid ${T.bgCard}` }}>
      {count > 9 ? '9+' : count}
    </div>
  )
}
