import { doc, updateDoc } from 'firebase/firestore'
import { computed } from 'vue'
import { useCurrentUser, useDocument, useFirestore } from 'vuefire'
import {
  updateEquippedTitleInput,
  updateUserProfileInput,
  type UpdateEquippedTitleInput,
  type UpdateUserProfileInput,
  type User,
} from '@hitojichi/shared'

/** ログイン中ユーザーの users/{uid} プロフィール（titleIdsなど）の取得・更新 */
export function useCurrentUserProfile() {
  const db = useFirestore()
  const currentUser = useCurrentUser()

  const userRef = computed(() => {
    const uid = currentUser.value?.uid
    return uid ? doc(db, 'users', uid) : null
  })

  const profile = useDocument<User>(userRef)

  async function updateProfile(input: UpdateUserProfileInput) {
    const uid = currentUser.value?.uid
    if (!uid) throw new Error('ログインが必要です')

    await updateDoc(doc(db, 'users', uid), updateUserProfileInput.parse(input))
  }

  /** プロフィールに表示する称号を装備する（nullで外す）。獲得済みかどうかはRulesで確認する */
  async function updateEquippedTitle(input: UpdateEquippedTitleInput) {
    const uid = currentUser.value?.uid
    if (!uid) throw new Error('ログインが必要です')

    await updateDoc(doc(db, 'users', uid), updateEquippedTitleInput.parse(input))
  }

  return { profile, updateProfile, updateEquippedTitle }
}
