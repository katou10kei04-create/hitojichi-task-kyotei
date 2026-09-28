import { doc, getDoc } from 'firebase/firestore'
import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useFirestore } from 'vuefire'
import { userSchema, type User } from '@hitojichi/shared'

export type TeamMember = User & { id: string }

/** チームメンバー(uid配列)から表示名などのプロフィールをまとめて取得する */
export function useTeamMembers(memberIds: MaybeRefOrGetter<string[] | undefined>) {
  const db = useFirestore()
  const members = ref<TeamMember[]>([])

  watch(
    () => toValue(memberIds),
    async (ids) => {
      if (!ids || ids.length === 0) {
        members.value = []
        return
      }
      const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, 'users', id))))
      members.value = snapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) => ({ id: snapshot.id, ...userSchema.parse(snapshot.data()) }))
    },
    { immediate: true },
  )

  return members
}
