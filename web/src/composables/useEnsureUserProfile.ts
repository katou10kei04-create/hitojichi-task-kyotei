import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { User as FirebaseUser } from 'firebase/auth'
import { userSchema } from '@hitojichi/shared'
import { db } from '@/lib/firebase'

/**
 * users/{uid} が無ければ初回ログイン時に作成する。
 * titleIds は空配列固定（称号はFunctionsのみ付与可、Firestoreルールでも強制）。
 */
export async function ensureUserProfile(user: FirebaseUser) {
  const ref = doc(db, 'users', user.uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) return

  const profile = userSchema.parse({
    displayName: user.displayName?.trim() || '名無しさん',
    photoURL: user.photoURL,
    titleIds: [],
  })
  await setDoc(ref, profile)
}
