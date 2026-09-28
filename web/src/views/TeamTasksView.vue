<script setup lang="ts">
import { computed, ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import { Check, Plus } from 'lucide-vue-next'
import { createTaskInput, taskStatusSchema, type Task } from '@hitojichi/shared'
import { useTeamTasks } from '@/composables/useTeamTasks'
import { useTeamMembers } from '@/composables/useTeamMembers'

const props = defineProps<{ teamId: string }>()

const { team, tasks, createTask, completeTask } = useTeamTasks(() => props.teamId)
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
      class="flex items-center gap-3 rounded border px-4 py-3"
    >
      <div class="flex-1">
        <p class="font-bold">{{ task.title }}</p>
        <p class="text-xs text-gray-500">
          担当: {{ memberName(task.assigneeId) }} ／ 人質: {{ memberName(task.hostageId) }}
        </p>
        <p class="text-xs text-gray-500">期限: {{ formatDueAt(task.dueAt) }}</p>
      </div>
      <span class="text-xs font-bold">{{ statusLabel[task.status] }}</span>
      <button
        v-if="task.status === 'todo'"
        class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm"
        @click="onComplete(task)"
      >
        <Check :size="16" />
        完了
      </button>
    </li>
  </ul>
</template>
