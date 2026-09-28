import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  type CollectionReference,
} from 'firebase/firestore'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import {
  createTaskInput,
  taskSchema,
  type Task,
  type Team,
} from '@hitojichi/shared'

type TaskInput = {
  title: string
  assigneeId: string
  hostageId: string
  dueAt: Date
}

/** チーム詳細とチーム内タスクのCRUDをまとめたcomposable */
export function useTeamTasks(teamId: MaybeRefOrGetter<string>) {
  const db = useFirestore()

  const teamRef = computed(() => doc(db, 'teams', toValue(teamId)))
  const team = useDocument<Team>(teamRef)

  const tasksRef = computed(
    () =>
      collection(
        db,
        'teams',
        toValue(teamId),
        'tasks',
      ) as CollectionReference<Task>,
  )

  // Read
  const tasks = useCollection<Task>(tasksRef)

  // Create
  async function createTask(input: TaskInput) {
    const validatedInput = createTaskInput.parse(input)

    const task = taskSchema.parse({
      ...validatedInput,
      status: 'todo',
    })

    await addDoc(
      collection(db, 'teams', toValue(teamId), 'tasks'),
      task,
    )
  }

  // Update
  async function updateTask(taskId: string, input: TaskInput) {
    const validatedInput = createTaskInput.parse(input)

    await updateDoc(
      doc(db, 'teams', toValue(teamId), 'tasks', taskId),
      validatedInput,
    )
  }

  // Update status
  async function completeTask(taskId: string) {
    await updateDoc(
      doc(db, 'teams', toValue(teamId), 'tasks', taskId),
      {
        status: 'done',
      },
    )
  }

  // Delete
  async function deleteTask(taskId: string) {
    await deleteDoc(
      doc(db, 'teams', toValue(teamId), 'tasks', taskId),
    )
  }

  return {
    team,
    tasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  }
}
