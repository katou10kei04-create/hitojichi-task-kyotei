import { addDoc, collection, doc, updateDoc, type CollectionReference } from 'firebase/firestore'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import { taskSchema, type Task, type Team } from '@hitojichi/shared'

/** チーム詳細（メンバー等）とチーム内タスクの取得・作成・状態更新をまとめたcomposable */
export function useTeamTasks(teamId: MaybeRefOrGetter<string>) {
  const db = useFirestore()

  const teamRef = computed(() => doc(db, 'teams', toValue(teamId)))
  const team = useDocument<Team>(teamRef)

  const tasksRef = computed(
    () => collection(db, 'teams', toValue(teamId), 'tasks') as CollectionReference<Task>,
  )
  const tasks = useCollection<Task>(tasksRef)

  async function createTask(input: {
    title: string
    assigneeId: string
    hostageId: string
    dueAt: Date
  }) {
    const task = taskSchema.parse({ ...input, status: 'todo' })
    await addDoc(collection(db, 'teams', toValue(teamId), 'tasks'), task)
  }

  async function completeTask(taskId: string) {
    await updateDoc(doc(db, 'teams', toValue(teamId), 'tasks', taskId), {
      status: 'done',
    })
  }

  return { team, tasks, createTask, completeTask }
}
