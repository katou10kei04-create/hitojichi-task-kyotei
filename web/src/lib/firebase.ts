import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-hitojichi'

export const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  // 未設定だとsignInWithPopupが auth/auth-domain-config-required で落ちるため、Emulator用のダミーを補完する
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const functions = getFunctions(firebaseApp, 'asia-northeast1')

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}