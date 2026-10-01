import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { db } from '@/lib/firebase'

/**
 * 参加チームごとに、期限切れ(overdue)のタスクを持っているメンバーを集める。
 * dis称号の「発動中」判定に使う（完了すればoverdueでなくなり、解除される）。
 */
export function useOverdueTasks(teamIds: MaybeRefOrGetter<string[]>) {
  // チームID → 期限切れタスクを持つメンバーのuid
  const ownerIdsByTeam = ref<Record<string, string[]>>({})
  const failed = ref(false)
  const pending = ref(false)

  watch(
    () => toValue(teamIds),
    (ids, _, onCleanup) => {
      ownerIdsByTeam.value = {}
      failed.value = false
      pending.value = ids.length > 0
      let active = true
      const waiting = new Set(ids)
      const unsubscribes = ids.map((teamId) =>
        // チームごとの読み取りで、既存のメンバー限定Rulesをそのまま使う。
        onSnapshot(
          query(collection(db, 'teams', teamId, 'tasks'), where('status', '==', 'overdue')),
          (snapshot) => {
            if (!active) return
            ownerIdsByTeam.value[teamId] = [
              ...new Set(snapshot.docs.map((entry) => String(entry.get('ownerId')))),
            ]
            waiting.delete(teamId)
            pending.value = waiting.size > 0
          },
          () => {
            if (!active) return
            failed.value = true
            waiting.delete(teamId)
            pending.value = waiting.size > 0
          },
        ),
      )
      onCleanup(() => {
        active = false
        unsubscribes.forEach((unsubscribe) => unsubscribe())
      })
    },
    { immediate: true },
  )

  return { ownerIdsByTeam: computed(() => ownerIdsByTeam.value), pending, failed }
}
