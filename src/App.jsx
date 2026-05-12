import { useEffect } from 'react'
import { AuthProvider, useAuth, LoginScreen, AccessDenied } from './components/Auth'
import { Layout } from './components/Layout'
import { useStore } from './store'
import ConversationsPage from './components/Conversations'
import AgentsPage        from './components/Agents'
import WidgetPage        from './components/Widget'
import SettingsPage      from './components/Settings'

// Flows page — import the full visual builder
import FlowsPage from './components/Flows'

function PageRouter() {
  const section = useStore(s => s.sidebarSection)
  return (
    <>
      {section === 'conversations' && <ConversationsPage/>}
      {section === 'agents'        && <AgentsPage/>}
      {section === 'flows'         && <FlowsPage/>}
      {section === 'widget'        && <WidgetPage/>}
      {section === 'settings'      && <SettingsPage/>}
    </>
  )
}

function AppShell() {
  const { user, agentDoc, ready } = useAuth()

  if (!ready) return (
    <div style={{ minHeight:'100vh', background:'#0B0A14', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#45425A', fontSize:14 }}>Cargando...</div>
    </div>
  )

  if (!user)     return <LoginScreen/>
  // agentDoc can take a moment to load after first login
  if (!agentDoc) return (
    <div style={{ minHeight:'100vh', background:'#0B0A14', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#45425A', fontSize:14 }}>Verificando acceso...</div>
    </div>
  )
  if (!agentDoc.active) return <AccessDenied user={user}/>

  return (
    <Layout>
      <PageRouter/>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell/>
    </AuthProvider>
  )
}
