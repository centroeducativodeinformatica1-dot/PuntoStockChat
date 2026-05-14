// ============================================================
// PUNTOSTOCK - Firebase Configuration
// Reemplazá estos valores con los de tu proyecto Firebase
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCsbEYeXZ3zQrIvrJN1t-q-cpXOZbQYpgU",
  authDomain: "puntostock-56850.firebaseapp.com",
  projectId: "puntostock-56850",
  storageBucket: "puntostock-56850.firebasestorage.app",
  messagingSenderId: "493523407446",
  appId: "1:493523407446:web:ed649d8cf185a0a9c3e1f7",
  measurementId: "G-TKLCH8S648"
};

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// Helper: obtener negocio del usuario autenticado
// ============================================================
async function getBusinessId() {
  const user = auth.currentUser;
  if (!user) return null;
  // El businessId es el UID del negocio (no del usuario)
  // Se guarda en el perfil del usuario
  const snap = await db.collection('users').doc(user.uid).get();
  return snap.exists ? snap.data().businessId : null;
}

// ============================================================
// Helper: referencia a colección del negocio
// Todos los datos están bajo /businesses/{businessId}/...
// ============================================================
function bizCol(businessId, collection) {
  return db.collection('businesses').doc(businessId).collection(collection);
}
