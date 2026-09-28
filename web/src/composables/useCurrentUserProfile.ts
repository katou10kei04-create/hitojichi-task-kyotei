import { doc, updateDoc } from 'firebase/firestore'
import { computed } from 'vue'
import { useCurrentUser, useDocument, useFirestore } from 'vuefire'
import { updateUserProfileInput, type User } from '@hitojichi/shared'

/** ログイン中ユーザーの users/{uid} プロフィール（titleIdsなど）の取得・更新 */
export function useCurrentUserProfile() {
  const db = useFirestore()
  const currentUser = useCurrentUser()

  const userRef = computed(() => {
    const uid = currentUser.value?.uid
    return uid ? doc(db, 'users', uid) : null
  })

  const profile = useDocument<User>(userRef)

  async function updateDisplayName(displayName: string) {
    const uid = currentUser.value?.uid
    if (!uid) throw new Error('ログインが必要です')

    const input = updateUserProfileInput.parse({ displayName })
    await updateDoc(doc(db, 'users', uid), input)
  }

  return { profile, updateDisplayName }
}
