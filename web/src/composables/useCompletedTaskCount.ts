import { collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useCurrentUser } from 'vuefire'
import { db } from '@/lib/firebase'

/** 一覧表示用の完了タスク。teamId でチーム名を引けるようにしておく */
export type CompletedTask = { id: string; teamId: string; title: string; dueAt: Date | null }

/** 参加チーム内に現在保存されている、本人の完了タスクを合算する（一覧も返す）。 */
export function useCompletedTaskCount(teamIds: MaybeRefOrGetter<string[]>) {
  const currentUser = useCurrentUser()
  const tasksByTeam = ref<Record<string, CompletedTask[]>>({})
  const failed = ref(false)
  const pending = ref(false)

  watch(
    [() => toValue(teamIds), () => currentUser.value?.uid],
    ([ids, uid], _, onCleanup) => {
      tasksByTeam.value = {}
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
            tasksByTeam.value[teamId] = snapshot.docs
              .filter((entry) => {
                const task = entry.data()
                return task.ownerId === uid && task.status === 'done'
              })
              .map((entry) => {
                const dueAt = entry.get('dueAt')
                return {
                  id: entry.id,
                  teamId,
                  title: String(entry.get('title') ?? ''),
                  dueAt: dueAt instanceof Timestamp ? dueAt.toDate() : null,
                }
              })
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

  // 期限が新しい順に並べる（期限なしは最後）
  const tasks = computed(() =>
    Object.values(tasksByTeam.value)
      .flat()
      .sort((a, b) => (b.dueAt?.getTime() ?? 0) - (a.dueAt?.getTime() ?? 0)),
  )
  const count = computed(() => tasks.value.length)
  return { count, tasks, pending, failed }
}
