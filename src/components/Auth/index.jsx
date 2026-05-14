import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db, gProvider } from '../../lib/firebase'
import { useStore } from '../../store'
import { useTheme } from '../../lib/ThemeContext'
import { getTheme } from '../../lib/theme'
import { Icon, GoogleIcon } from '../Icon'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ← Tu email de Google como administrador
export const OWNER_EMAIL = 'abellewi49@gmail.com'

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [ready, setReady]       = useState(false)
  const [agentDoc, setAgentDoc] = useState(null)
  const setStoreUser      = useStore(s => s.setUser)
  const setStoreAgentDoc  = useStore(s => s.setAgentDoc)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u); setStoreUser(u)
      if (u) {
        const ref  = doc(db, 'agents', u.uid)
        const snap = await getDoc(ref)

        if (!snap.exists()) {
          const isOwner = u.email === OWNER_EMAIL

          // Verificar si fue invitado
          let isInvited = false
          let inviteRole = 'agent'
          try {
            const invQ = query(collection(db,'invites'), where('email','==',u.email.toLowerCase()), where('used','==',false))
            const invSnap = await getDocs(invQ)
            if (!invSnap.empty) {
              isInvited = true
              inviteRole = invSnap.docs[0].data().role || 'agent'
              // Marcar invite como usado
              await setDoc(invSnap.docs[0].ref, { used: true }, { merge: true })
            }
          } catch {}

          await setDoc(ref, {
            uid:      u.uid,
            name:     u.displayName || 'Agente',
            email:    u.email,
            photoURL: u.photoURL || '',
            role:     isOwner ? 'admin' : inviteRole,
            status:   'online',
            active:   isOwner || isInvited,
            createdAt: Date.now(),
          })
        }

        const unsubDoc = onSnapshot(ref, s => {
          setAgentDoc(s.data())
          setStoreAgentDoc(s.data())
        })
        setReady(true)
        return () => unsubDoc()
      } else {
        setAgentDoc(null); setStoreAgentDoc(null); setReady(true)
      }
    })
  }, [])

  const login  = () => signInWithPopup(auth, gProvider)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, agentDoc, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function LoginScreen() {
  const { login }  = useAuth()
  const { mode }   = useTheme()
  const T          = getTheme(mode)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setErr(''); setLoading(true)
    try { await login() }
    catch { setErr('Error al iniciar sesión. Intentá de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui', transition:'background 0.3s' }}>
      <div style={{ width:420, background:T.bgCard, borderRadius:20, padding:'48px 40px', border:`1px solid ${T.border}`, boxShadow:T.shadowLg, textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:16, background:T.primary, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:`0 4px 14px ${T.primary}44` }}>
          <Icon n="zap" size={26} color="#fff"/>
        </div>
        <div style={{ color:T.text, fontSize:26, fontWeight:800, marginBottom:6, letterSpacing:-0.5 }}>ChatFlow</div>
        <div style={{ color:T.textMuted, fontSize:14, marginBottom:36, lineHeight:1.6 }}>
          Plataforma de atención al cliente en vivo<br/>
          <span style={{ color:T.textFaint, fontSize:12 }}>Acceso restringido a agentes autorizados</span>
        </div>

        <div style={{ background:T.bgSurface, borderRadius:12, padding:'14px 16px', marginBottom:28, display:'flex', gap:10, textAlign:'left', alignItems:'flex-start', border:`1px solid ${T.border}` }}>
          <Icon n="shield" size={16} color={T.warning} style={{ marginTop:1, flexShrink:0 }}/>
          <div style={{ color:T.textMuted, fontSize:12.5, lineHeight:1.6 }}>
            Solo agentes invitados por el administrador pueden acceder a esta plataforma.
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 20px', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'#1a1a2e', boxShadow:T.shadowMd, transition:'all 0.15s', opacity:loading?0.7:1 }}>
          <GoogleIcon size={20}/>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        {err && (
          <div style={{ marginTop:16, background:`${T.danger}12`, border:`1px solid ${T.danger}33`, borderRadius:10, padding:'10px 14px', color:T.danger, fontSize:12.5 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  )
}

export function AccessDenied({ user }) {
  const { logout } = useAuth()
  const { mode }   = useTheme()
  const T          = getTheme(mode)
  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui' }}>
      <div style={{ width:420, background:T.bgCard, borderRadius:20, padding:48, border:`1px solid ${T.danger}33`, boxShadow:T.shadowLg, textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:`${T.danger}12`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Icon n="shield" size={26} color={T.danger}/>
        </div>
        <div style={{ color:T.danger, fontSize:20, fontWeight:800, marginBottom:10 }}>Acceso denegado</div>
        <div style={{ color:T.textMuted, fontSize:13, marginBottom:8 }}>
          La cuenta <strong style={{ color:T.text }}>{user?.email}</strong> no está autorizada.
        </div>
        <div style={{ color:T.textFaint, fontSize:12, marginBottom:32 }}>Contactá al administrador para solicitar acceso.</div>
        <button onClick={logout} style={{ background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 20px', color:T.textMuted, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
          <Icon n="logOut" size={14} color={T.textMuted}/> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
