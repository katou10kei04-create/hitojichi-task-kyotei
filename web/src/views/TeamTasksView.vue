<script setup lang="ts">
import { computed, ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { createTaskInput, taskStatusSchema, type Task } from '@hitojichi/shared'
import { useTeamTasks } from '@/composables/useTeamTasks'
import { useTeamMembers } from '@/composables/useTeamMembers'

const props = defineProps<{ teamId: string }>()

const {
  team,
  tasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} = useTeamTasks(() => props.teamId)
const memberIds = computed(() => team.value?.memberIds)
const members = useTeamMembers(memberIds)
const isTasksPending = computed(() => tasks.pending.value)

function memberName(uid: string) {
  return members.value.find((member) => member.id === uid)?.displayName ?? '(不明なメンバー)'
}

// FirestoreのTimestampがそのまま返ってくる場合があるため、表示前にDateへ揃える
function formatDueAt(dueAt: Task['dueAt']) {
  const date = dueAt instanceof Timestamp ? dueAt.toDate() : dueAt
  return date.toLocaleString('ja-JP')
}

const statusLabel: Record<(typeof taskStatusSchema)['options'][number], string> = {
  todo: '未着手',
  done: '完了',
  overdue: '期限切れ',
}

const title = ref('')
const assigneeId = ref('')
const hostageId = ref('')
const dueAt = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const editingTaskId = ref<string | null>(null)
const editTitle = ref('')
const editAssigneeId = ref('')
const editHostageId = ref('')
const editDueAt = ref('')

function toDateTimeLocal(dueAt: Task['dueAt']) {
  const date = dueAt instanceof Timestamp ? dueAt.toDate() : dueAt
  const offset = date.getTimezoneOffset()

  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function startEdit(task: Task & { id: string }) {
  editingTaskId.value = task.id
  editTitle.value = task.title
  editAssigneeId.value = task.assigneeId
  editHostageId.value = task.hostageId
  editDueAt.value = toDateTimeLocal(task.dueAt)
}

function cancelEdit() {
  editingTaskId.value = null
}

async function submit() {
  errorMessage.value = ''
  const parsed = createTaskInput.safeParse({
    title: title.value,
    assigneeId: assigneeId.value,
    hostageId: hostageId.value,
    dueAt: dueAt.value ? new Date(dueAt.value) : undefined,
  })
  if (!parsed.success) {
    errorMessage.value = 'タスク名・担当者・人質・期限をすべて入力してください。'
    return
  }

  isSubmitting.value = true
  try {
    await createTask(parsed.data)
    title.value = ''
    assigneeId.value = ''
    hostageId.value = ''
    dueAt.value = ''
  } catch (error) {
    console.error(error)
    errorMessage.value = 'タスクの作成に失敗しました。もう一度お試しください。'
  } finally {
    isSubmitting.value = false
  }
}

async function onComplete(task: Task & { id: string }) {
  try {
    await completeTask(task.id)
  } catch (error) {
    console.error(error)
  }
}

async function saveEdit(taskId: string) {
  const parsed = createTaskInput.safeParse({
    title: editTitle.value,
    assigneeId: editAssigneeId.value,
    hostageId: editHostageId.value,
    dueAt: editDueAt.value ? new Date(editDueAt.value) : undefined,
  })
  if (!parsed.success) {
    return
  }

  try {
    await updateTask(taskId, parsed.data)
    editingTaskId.value = null
  } catch (error) {
    console.error(error)
  }
}

async function onDelete(task: Task & { id: string }) {
  const confirmed = window.confirm(`「${task.title}」を削除しますか？`)

  if (!confirmed) {
    return
  }

  try {
    await deleteTask(task.id)
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <h1 class="text-xl font-bold">タスク管理（{{ team?.name ?? '読み込み中…' }}）</h1>

  <form class="mt-4 flex max-w-md flex-col gap-3 rounded border p-4" @submit.prevent="submit">
    <label class="flex flex-col gap-1 text-sm">
      タスク名
      <input
        v-model="title"
        type="text"
        maxlength="100"
        placeholder="例：企画書を書く"
        class="rounded border px-3 py-2"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      担当者
      <select v-model="assigneeId" class="rounded border px-3 py-2">
        <option value="" disabled>選択してください</option>
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.displayName }}
        </option>
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm">
      人質（サボったら巻き添えになる相手）
      <select v-model="hostageId" class="rounded border px-3 py-2">
        <option value="" disabled>選択してください</option>
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.displayName }}
        </option>
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm">
      期限
      <input v-model="dueAt" type="datetime-local" class="rounded border px-3 py-2" />
    </label>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <button
      type="submit"
      class="flex items-center justify-center gap-1 rounded border px-4 py-2 font-bold disabled:opacity-50"
      :disabled="isSubmitting"
    >
      <Plus :size="16" />
      {{ isSubmitting ? '作成中…' : 'タスクを追加' }}
    </button>
  </form>

  <p v-if="isTasksPending" class="mt-6 text-sm text-gray-500">読み込み中…</p>
  <p v-else-if="tasks.length === 0" class="mt-6 text-sm text-gray-500">タスクはまだありません。</p>

  <ul v-else class="mt-6 flex flex-col gap-2">
    <li
      v-for="task in tasks"
      :key="task.id"
      class="rounded border px-4 py-3"
    >
      <!-- 編集中 -->
      <div v-if="editingTaskId === task.id" class="flex flex-col gap-3">
        <input
          v-model="editTitle"
          type="text"
          maxlength="100"
          aria-label="タスク名"
          class="rounded border px-3 py-2"
        />
        <select v-model="editAssigneeId" aria-label="担当者" class="rounded border px-3 py-2">
          <option value="" disabled>担当者を選択</option>
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.displayName }}
          </option>
        </select>
        <select v-model="editHostageId" aria-label="人質" class="rounded border px-3 py-2">
          <option value="" disabled>人質を選択</option>
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.displayName }}
          </option>
        </select>
        <input
          v-model="editDueAt"
          type="datetime-local"
          aria-label="期限"
          class="rounded border px-3 py-2"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            @click="saveEdit(task.id)"
          >
            <Save :size="16" />
            保存
          </button>
          <button
            type="button"
            class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            @click="cancelEdit"
          >
            <X :size="16" />
            キャンセル
          </button>
        </div>
      </div>
      <!-- 通常表示 -->
      <div v-else class="flex items-center gap-3">
        <div class="flex-1">
          <p class="font-bold">{{ task.title }}</p>

          <p class="text-xs text-gray-500">
            担当: {{ memberName(task.assigneeId) }} ／ 人質: {{ memberName(task.hostageId) }}
          </p>

          <p class="text-xs text-gray-500">期限: {{ formatDueAt(task.dueAt) }}</p>
        </div>

        <span class="text-xs font-bold">
          {{ statusLabel[task.status] }}
        </span>

        <button
          type="button"
          class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm"
          @click="startEdit(task)"
        >
          <Pencil :size="16" />
          編集
        </button>

        <button
          type="button"
          class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm"
          @click="onDelete(task)"
        >
          <Trash2 :size="16" />
          削除
        </button>

        <button
          v-if="task.status === 'todo'"
          type="button"
          class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm"
          @click="onComplete(task)"
        >
          <Check :size="16" />
          完了
        </button>
      </div>
    </li>
  </ul>
</template>
