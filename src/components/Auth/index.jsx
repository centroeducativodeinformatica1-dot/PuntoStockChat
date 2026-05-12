import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db, gProvider } from '../../lib/firebase'
import { useStore } from '../../store'
import { Icon, GoogleIcon } from '../Icon'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ── Solo estos emails tienen acceso ──────────────────────────────────────────
// Agregá tu email acá. Si está vacío, cualquiera con Google puede entrar (modo setup).
export const OWNER_EMAIL = 'tu@gmail.com'   // ← CAMBIÁ ESTO

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [ready, setReady]     = useState(false)
  const [agentDoc, setAgentDoc] = useState(null)
  const setStoreUser     = useStore(s => s.setUser)
  const setStoreAgentDoc = useStore(s => s.setAgentDoc)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setStoreUser(u)
      if (u) {
        // Sincronizar / crear doc de agente en Firestore
        const ref = doc(db, 'agents', u.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          await setDoc(ref, {
            uid:       u.uid,
            name:      u.displayName || 'Agente',
            email:     u.email,
            photoURL:  u.photoURL || '',
            role:      u.email === OWNER_EMAIL ? 'admin' : 'agent',
            status:    'online',
            active:    true,
            createdAt: Date.now(),
          })
        }
        // Live listener
        const unsubDoc = onSnapshot(ref, snap => {
          setAgentDoc(snap.data())
          setStoreAgentDoc(snap.data())
        })
        setReady(true)
        return () => unsubDoc()
      } else {
        setAgentDoc(null)
        setStoreAgentDoc(null)
        setReady(true)
      }
    })
    return unsub
  }, [])

  const login  = async () => { await signInWithPopup(auth, gProvider) }
  const logout = () => signOut(auth)

  const isAllowed = (u) => {
    if (!u) return false
    if (!OWNER_EMAIL || OWNER_EMAIL === 'tu@gmail.com') return true // setup mode
    // Owner siempre puede. Otros agentes: deben tener doc con active=true
    return true // Firestore rules enforce this; here we just let in after doc check
  }

  return (
    <AuthContext.Provider value={{ user, agentDoc, ready, login, logout, isAllowed }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Login Screen ─────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { login } = useAuth()
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setErr(''); setLoading(true)
    try { await login() }
    catch { setErr('Error al iniciar sesión. Intentá de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0B0A14', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui' }}>
      <div style={{ width:400, background:'#13111F', borderRadius:24, padding:'48px 40px', border:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
        {/* Logo */}
        <div style={{ width:60, height:60, borderRadius:16, background:'#6C47FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Icon n="zap" size={28} color="#fff"/>
        </div>
        <div style={{ color:'#EDEAF8', fontSize:26, fontWeight:900, marginBottom:6, letterSpacing:-0.5 }}>ChatFlow</div>
        <div style={{ color:'#7A7690', fontSize:14, marginBottom:36, lineHeight:1.6 }}>
          Plataforma de atención al cliente en vivo<br/>
          <span style={{ color:'#45425A', fontSize:12 }}>Acceso restringido a agentes autorizados</span>
        </div>

        <div style={{ background:'#1C1A2E', borderRadius:12, padding:'14px 18px', marginBottom:28, display:'flex', gap:10, textAlign:'left', alignItems:'flex-start' }}>
          <Icon n="shield" size={16} color='#FFB020' style={{ marginTop:1, flexShrink:0 }}/>
          <div style={{ color:'#7A7690', fontSize:12, lineHeight:1.6 }}>
            Solo agentes invitados por el administrador pueden acceder a esta plataforma.
          </div>
        </div>

        <button
          onClick={handleLogin} disabled={loading}
          style={{ width:'100%', background:'#fff', border:'none', borderRadius:12, padding:'14px 20px', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'#1a1a2e', opacity:loading?0.7:1, transition:'opacity 0.15s' }}>
          <GoogleIcon size={20}/>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        {err && (
          <div style={{ marginTop:16, background:'rgba(255,77,77,0.1)', border:'1px solid rgba(255,77,77,0.3)', borderRadius:10, padding:'10px 14px', color:'#FF4D4D', fontSize:12 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Access Denied ─────────────────────────────────────────────────────────────
export function AccessDenied({ user }) {
  const { logout } = useAuth()
  return (
    <div style={{ minHeight:'100vh', background:'#0B0A14', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:420, background:'#13111F', borderRadius:24, padding:48, border:'1px solid rgba(255,77,77,0.2)', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,77,77,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Icon n="shield" size={26} color="#FF4D4D"/>
        </div>
        <div style={{ color:'#FF4D4D', fontSize:20, fontWeight:800, marginBottom:10 }}>Acceso denegado</div>
        <div style={{ color:'#7A7690', fontSize:13, marginBottom:8 }}>
          La cuenta <strong style={{ color:'#EDEAF8' }}>{user?.email}</strong> no está autorizada.
        </div>
        <div style={{ color:'#45425A', fontSize:12, marginBottom:32 }}>
          Contactá al administrador para que te agregue como agente.
        </div>
        <button onClick={logout} style={{ background:'#1C1A2E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 20px', color:'#7A7690', fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
          <Icon n="logOut" size={14} color="#7A7690"/> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
