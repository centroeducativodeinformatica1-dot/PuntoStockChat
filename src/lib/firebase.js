import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCiAfQSrfZ5p0nggi8qv5dMXT4k_-gMtko",
  authDomain: "chat-web-4e49d.firebaseapp.com",
  projectId: "chat-web-4e49d",
  storageBucket: "chat-web-4e49d.firebasestorage.app",
  messagingSenderId: "589970889814",
  appId: "1:589970889814:web:a497e3d3af23044aec2ff7",
  // Agregá tu databaseURL cuando actives Realtime Database en Firebase Console:
  // databaseURL: "https://chat-web-4e49d-default-rtdb.firebaseio.com",
}

export const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const db       = getFirestore(app)
export const rtdb     = getDatabase(app)
export const gProvider = new GoogleAuthProvider()
