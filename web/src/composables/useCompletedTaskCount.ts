import { collection, onSnapshot } from 'firebase/firestore'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useCurrentUser } from 'vuefire'
import { db } from '@/lib/firebase'

/** 参加チーム内に現在保存されている、本人の完了タスクを合算する。 */
export function useCompletedTaskCount(teamIds: MaybeRefOrGetter<string[]>) {
  const currentUser = useCurrentUser()
  const counts = ref<Record<string, number>>({})
  const failed = ref(false)
  const pending = ref(false)

  watch(
    [() => toValue(teamIds), () => currentUser.value?.uid],
    ([ids, uid], _, onCleanup) => {
      counts.value = {}
      failed.value = false
      pending.value = !!uid && ids.length > 0
      if (!uid) return
      let active = true
      const waiting = new Set(ids)
      const unsubscribes = ids.map((teamId) =>
        // チームごとの読み取りで、既存のメンバー限定Rulesをそのまま使う。
        onSnapshot(
          collection(db, 'teams', teamId, 'tasks'),
          (snapshot) => {
            if (!active) return
            counts.value[teamId] = snapshot.docs.filter((entry) => {
              const task = entry.data()
              return task.ownerId === uid && task.status === 'done'
            }).length
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

  const count = computed(() =>
    Object.values(counts.value).reduce((total, value) => total + value, 0),
  )
  return { count, pending, failed }
}
