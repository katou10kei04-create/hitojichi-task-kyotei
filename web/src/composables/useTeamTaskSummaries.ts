import { collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { Task } from '@hitojichi/shared'
import { db } from '@/lib/firebase'

/** チーム一覧のカードに出す、チームごとのタスク集計 */
export type TeamTaskSummary = {
  total: number
  done: number
  /** チーム進捗度（0〜100、タスクが無ければ0） */
  teamProgress: number
  /** 未完了タスクのうち一番近い期限 */
  nextDueAt: Date | null
  /** 全タスクのうち一番遅い期限 */
  lastDueAt: Date | null
  /** 終了したチーム：タスクが1件以上あり、未完了がなく、一番遅い期限も過ぎている */
  ended: boolean
}

function toDate(value: Task['dueAt'] | Timestamp) {
  return value instanceof Timestamp ? value.toDate() : value
}

function summarize(tasks: Task[], now: number): TeamTaskSummary {
  let nextDueAt: Date | null = null
  let lastDueAt: Date | null = null
  let done = 0
  let hasTodo = false
  for (const task of tasks) {
    const dueAt = toDate(task.dueAt)
    if (!lastDueAt || dueAt > lastDueAt) lastDueAt = dueAt
    if (task.status === 'done') done++
    if (task.status === 'todo') {
      hasTodo = true
      if (!nextDueAt || dueAt < nextDueAt) nextDueAt = dueAt
    }
  }
  const total = tasks.length
  return {
    total,
    done,
    teamProgress: total === 0 ? 0 : Math.round((done / total) * 100),
    nextDueAt,
    lastDueAt,
    ended: total > 0 && !hasTodo && !!lastDueAt && lastDueAt.getTime() < now,
  }
}

/** 複数チームのタスクをまとめて購読し、チームごとの集計を返す。 */
export function useTeamTaskSummaries(teamIds: MaybeRefOrGetter<string[]>) {
  const tasksByTeam = ref<Record<string, Task[]>>({})
  const failedTeamIds = ref<Record<string, boolean>>({})

  watch(
    () => toValue(teamIds),
    (ids, _, onCleanup) => {
      tasksByTeam.value = {}
      failedTeamIds.value = {}
      let active = true
      const unsubscribes = ids.map((teamId) =>
        // チームごとの読み取りで、既存のメンバー限定Rulesをそのまま使う。
        onSnapshot(
          collection(db, 'teams', teamId, 'tasks'),
          (snapshot) => {
            if (!active) return
            tasksByTeam.value[teamId] = snapshot.docs.map((entry) => entry.data() as Task)
          },
          () => {
            if (!active) return
            failedTeamIds.value[teamId] = true
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

  /** 読み込みが終わったチームだけ入る（未取得・失敗のチームは undefined） */
  const summaries = computed(() => {
    const now = Date.now()
    const result: Record<string, TeamTaskSummary> = {}
    for (const [teamId, tasks] of Object.entries(tasksByTeam.value)) {
      result[teamId] = summarize(tasks, now)
    }
    return result
  })

  return { summaries, failedTeamIds }
}
