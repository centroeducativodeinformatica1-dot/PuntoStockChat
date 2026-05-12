import { AuthProvider, useAuth, LoginScreen, AccessDenied } from './components/Auth'
import { ThemeProvider } from './lib/ThemeContext'
import { Layout } from './components/Layout'
import { useStore } from './store'
import ConversationsPage from './components/Conversations'
import AgentsPage        from './components/Agents'
import FlowsPage         from './components/Flows'
import WidgetPage        from './components/Widget'
import SettingsPage      from './components/Settings'
import { getTheme }      from './lib/theme'
import { useTheme }      from './lib/ThemeContext'

function PageRouter() {
  const section = useStore(s => s.sidebarSection)
  return (
    <>
      {section==='conversations' && <ConversationsPage/>}
      {section==='agents'        && <AgentsPage/>}
      {section==='flows'         && <FlowsPage/>}
      {section==='widget'        && <WidgetPage/>}
      {section==='settings'      && <SettingsPage/>}
    </>
  )
}

function AppShell() {
  const { user, agentDoc, ready } = useAuth()
  const { mode } = useTheme()
  const T = getTheme(mode)

  if (!ready) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui', transition:'background 0.3s' }}>
      <div style={{ color:T.textMuted, fontSize:14 }}>Cargando...</div>
    </div>
  )
  if (!user)     return <LoginScreen/>
  if (!agentDoc) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui' }}>
      <div style={{ color:T.textMuted, fontSize:14 }}>Verificando acceso...</div>
    </div>
  )
  if (!agentDoc.active) return <AccessDenied user={user}/>

  return <Layout><PageRouter/></Layout>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell/>
      </AuthProvider>
    </ThemeProvider>
  )
}
