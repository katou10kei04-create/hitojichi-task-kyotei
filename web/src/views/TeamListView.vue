<script setup lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { FirebaseError } from 'firebase/app'
import { Timestamp } from 'firebase/firestore'
import { RouterLink } from 'vue-router'
import { Plus, Users } from 'lucide-vue-next'
import { useTeams } from '@/composables/useTeams'
import { useTeamTasks } from '@/composables/useTeamTasks'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useTitles } from '@/composables/useTitles'
import { useCompletedTaskCount } from '@/composables/useCompletedTaskCount'

// チームごとに既存の進捗計算を購読する。一覧から消えた際は購読も解除される。
const TeamProgress = defineComponent({
  props: { teamId: { type: String, required: true } },
  setup(props, { slots }) {
    const { tasks, teamProgress } = useTeamTasks(() => props.teamId)
    const nextDueDate = computed(() => {
      let earliest: Date | null = null
      for (const task of tasks.value) {
        if (task.status !== 'todo') continue
        const date = task.dueAt instanceof Timestamp ? task.dueAt.toDate() : task.dueAt
        if (!earliest || date.getTime() < earliest.getTime()) earliest = date
      }
      if (!earliest) return 'なし'
      const month = String(earliest.getMonth() + 1).padStart(2, '0')
      const day = String(earliest.getDate()).padStart(2, '0')
      return `${earliest.getFullYear()}/${month}/${day}`
    })
    return () =>
      slots.default?.({
        progress: teamProgress.value,
        nextDueDate: nextDueDate.value,
        pending: tasks.pending.value,
        error: tasks.error.value,
      })
  },
})

const { teams, joinTeam } = useTeams()
const { profile } = useCurrentUserProfile()
const { titles } = useTitles()
const {
  count: completedTaskCount,
  pending: completedPending,
  failed: completedFailed,
} = useCompletedTaskCount(() => teams.value.map((team) => team.id))
const completedLabel = computed(() => {
  if (teams.error.value || completedFailed.value) return '取得失敗'
  if (teams.pending.value || completedPending.value) return '読み込み中…'
  return `${completedTaskCount.value}件`
})
const equippedTitleLabel = computed(() => {
  if (profile.error.value) return '取得失敗'
  if (profile.pending.value) return '読み込み中…'
  const id = profile.value?.equippedTitleId
  if (!id) return '未設定'
  if (titles.error.value) return '取得失敗'
  if (titles.pending.value) return '読み込み中…'
  return titles.value.find((title) => title.id === id)?.name ?? '称号が見つかりません'
})
const disTitleCountLabel = computed(() => {
  if (profile.error.value) return '取得失敗'
  if (profile.pending.value) return '読み込み中…'
  return `${profile.value?.titleIds.length ?? 0}件`
})
const inviteCode = ref('')
const isJoining = ref(false)
const joinError = ref('')
const joinMessage = ref('')
const joinDialog = ref<HTMLDialogElement | null>(null)

function openJoinDialog() {
  joinError.value = ''
  joinMessage.value = ''
  joinDialog.value?.showModal()
}

function closeJoinDialog() {
  joinDialog.value?.close()
}

async function submitJoin() {
  if (isJoining.value) return
  joinError.value = ''
  joinMessage.value = ''
  isJoining.value = true
  try {
    const { teamName } = await joinTeam({ inviteCode: inviteCode.value })
    inviteCode.value = ''
    closeJoinDialog()
    joinMessage.value = `「${teamName}」に参加しました（参加済みの場合もそのまま利用できます）。`
  } catch (error) {
    joinError.value =
      error instanceof FirebaseError &&
      [
        'functions/not-found',
        'functions/failed-precondition',
        'functions/unauthenticated',
        'functions/invalid-argument',
      ].includes(error.code)
        ? error.message
        : '参加に失敗しました。招待コードを確認して、もう一度お試しください。'
  } finally {
    isJoining.value = false
  }
}
const isPending = computed(() => teams.pending.value)
const loadError = computed(() => teams.error.value)
</script>

<template>
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">チーム一覧</h1>
    <RouterLink
      to="/teams/new"
      class="flex items-center gap-1 rounded border px-3 py-1.5 text-sm font-bold"
    >
      <Plus :size="16" />
      チーム作成
    </RouterLink>
  </div>

  <dl class="mt-4 grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-3" aria-label="ユーザーサマリー">
    <div class="rounded border p-3">
      <dt class="text-sm">達成タスク</dt>
      <dd class="mt-1 font-bold">{{ completedLabel }}</dd>
    </div>
    <div class="min-w-0 rounded border p-3">
      <dt class="text-sm">装備中の称号</dt>
      <dd class="mt-1 break-all font-bold">{{ equippedTitleLabel }}</dd>
    </div>
    <div class="rounded border p-3">
      <dt class="text-sm">付いているdis称号</dt>
      <dd class="mt-1 font-bold">{{ disTitleCountLabel }}</dd>
    </div>
  </dl>

  <p v-if="isPending" class="mt-4 text-sm text-gray-500">読み込み中…</p>
  <p v-else-if="loadError" class="mt-4 text-sm text-red-600">チーム一覧の取得に失敗しました。</p>
  <p v-else-if="teams.length === 0" class="mt-4 text-sm text-gray-500">
    まだ所属チームがありません。「チーム作成」から始めましょう。
  </p>

  <ul
    v-else
    class="mt-4 grid w-full max-w-6xl grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3"
  >
    <li
      v-for="team in teams"
      :key="team.id"
      class="flex min-w-0 flex-col gap-3 rounded border px-4 py-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Users :size="18" />
        <h2 class="min-w-0 break-all font-bold">{{ team.name }}</h2>
        <span class="rounded border px-2 py-0.5 text-xs">{{ team.memberIds.length }} / 2人</span>
        <!-- タスクの状態ではなく、人質となる相手の参加状況を表す。 -->
        <span
          v-if="team.memberIds.length === 1"
          class="rounded border px-2 py-0.5 text-xs"
          title="人質となる相手がまだ参加していません"
        >
          募集中
        </span>
        <span
          v-else-if="team.memberIds.length >= 2"
          class="rounded border px-2 py-0.5 text-xs"
          title="人質となる相手が参加済みです"
        >
          進行中
        </span>
      </div>
      <p
        v-if="team.description?.trim()"
        class="whitespace-pre-wrap break-all text-sm text-gray-500"
      >
        {{ team.description }}
      </p>
      <TeamProgress :team-id="team.id" v-slot="{ progress, nextDueDate, pending, error }">
        <p v-if="error" role="alert" class="text-sm text-red-600">進捗の取得に失敗しました。</p>
        <p v-else-if="pending" class="text-sm text-gray-500">進捗を読み込み中…</p>
        <div v-else>
          <p class="text-sm">チーム全体のタスク進捗：{{ progress }}%</p>
          <div
            role="progressbar"
            :aria-label="`${team.name}のタスク進捗`"
            :aria-valuenow="progress"
            :aria-valuemin="0"
            :aria-valuemax="100"
            class="mt-2 h-3 overflow-hidden rounded bg-gray-200"
          >
            <div class="h-full bg-gray-700" :style="{ width: `${progress}%` }" />
          </div>
        </div>
        <p class="break-all text-xs text-gray-500">招待コード: {{ team.inviteCode }}</p>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm">
            {{ error ? '期限 取得失敗' : pending ? '期限 読み込み中…' : `期限 ${nextDueDate}` }}
          </p>
          <RouterLink
            :to="`/teams/${team.id}`"
            :aria-label="`${team.name}に入る`"
            class="ml-auto shrink-0 rounded border px-3 py-1.5 text-sm font-bold hover:bg-gray-50"
          >
            入る →
          </RouterLink>
        </div>
      </TeamProgress>
    </li>
  </ul>
  <button
    type="button"
    class="mt-4 rounded border px-3 py-2 text-sm font-bold disabled:opacity-50"
    :disabled="isJoining"
    @click="openJoinDialog"
  >
    招待コードで参加
  </button>
  <p v-if="joinMessage" role="status" class="mt-2 text-sm">{{ joinMessage }}</p>
  <Teleport to="body">
    <dialog
      ref="joinDialog"
      aria-labelledby="join-dialog-title"
      class="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded border bg-white p-0 text-gray-900 backdrop:bg-black/30"
      @click.self="closeJoinDialog"
    >
      <form class="flex flex-col gap-3 p-4" @submit.prevent="submitJoin">
        <h2 id="join-dialog-title" class="font-bold">チームに参加</h2>
        <!-- 招待リンク入力などを追加する場合も、この入力領域にまとめる。 -->
        <div class="flex flex-col gap-2">
          <label class="flex flex-col gap-1 text-sm">
            招待コード
            <input
              v-model="inviteCode"
              type="text"
              required
              maxlength="128"
              autofocus
              class="rounded border px-3 py-2"
              :disabled="isJoining"
            />
          </label>
        </div>
        <p v-if="joinError" role="alert" class="text-sm text-red-600">{{ joinError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded border px-3 py-2 text-sm" @click="closeJoinDialog">
            キャンセル
          </button>
          <button
            type="submit"
            class="rounded border px-3 py-2 text-sm font-bold disabled:opacity-50"
            :disabled="isJoining || !inviteCode.trim()"
          >
            {{ isJoining ? '参加中…' : '参加' }}
          </button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
