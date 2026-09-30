<script setup lang="ts">
import { computed, ref } from 'vue'
import { FirebaseError } from 'firebase/app'
import { Crown, KeyRound, Link2, Plus, Skull, Trophy, Users } from 'lucide-vue-next'
import { useTeams } from '@/composables/useTeams'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useTitles } from '@/composables/useTitles'
import { useCompletedTaskCount } from '@/composables/useCompletedTaskCount'
import { useTeamTaskSummaries } from '@/composables/useTeamTaskSummaries'
import BaseButton from '@/components/BaseButton.vue'
import IconTile from '@/components/IconTile.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import TeamCard from '@/components/TeamCard.vue'

const { teams, joinTeam } = useTeams()
const { profile } = useCurrentUserProfile()
const { titles } = useTitles()
const {
  count: completedTaskCount,
  pending: completedPending,
  failed: completedFailed,
} = useCompletedTaskCount(() => teams.value.map((team) => team.id))
// サマリーカードの表示値。数値のときだけ単位（件）を付ける
type Stat = { value: string; unit?: string }
const completedStat = computed<Stat>(() => {
  if (teams.error.value || completedFailed.value) return { value: '取得失敗' }
  if (teams.pending.value || completedPending.value) return { value: '読み込み中…' }
  return { value: String(completedTaskCount.value), unit: '件' }
})
const equippedTitleStat = computed<Stat>(() => {
  if (profile.error.value) return { value: '取得失敗' }
  if (profile.pending.value) return { value: '読み込み中…' }
  const id = profile.value?.equippedTitleId
  if (!id) return { value: '未設定' }
  if (titles.error.value) return { value: '取得失敗' }
  if (titles.pending.value) return { value: '読み込み中…' }
  return { value: titles.value.find((title) => title.id === id)?.name ?? '称号が見つかりません' }
})
const disTitleStat = computed<Stat>(() => {
  if (profile.error.value) return { value: '取得失敗' }
  if (profile.pending.value) return { value: '読み込み中…' }
  return { value: String(profile.value?.titleIds.length ?? 0), unit: '件' }
})
// 見出し「〇〇のチーム」。表示名が読み込めるまでは「チーム」だけ出す
const teamHeading = computed(() => {
  const name = profile.value?.displayName
  return name ? `${name}のチーム` : 'チーム'
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

// タスクの集計で「参加しているチーム」と「終了したチーム」に分ける。集計前のチームは参加中に入れる
const { summaries, failedTeamIds } = useTeamTaskSummaries(() => teams.value.map((team) => team.id))
const activeTeams = computed(() => teams.value.filter((team) => !summaries.value[team.id]?.ended))
const endedTeams = computed(() => teams.value.filter((team) => summaries.value[team.id]?.ended))
const loadError = computed(() => teams.error.value)
</script>

<template>
  <img
    src="/images/banner.jpg"
    alt="人質タスク協定 ― 仲間を人質に、サボりを封じろ"
    class="aspect-[8/3] w-full object-cover"
  />

  <section class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label="ユーザーサマリー">
    <StatCard :icon="Trophy" tone="primary" label="達成タスク" v-bind="completedStat" />
    <StatCard :icon="Crown" tone="accent" label="装備中の称号" v-bind="equippedTitleStat" />
    <StatCard :icon="Skull" tone="ink" label="付いているdis称号" v-bind="disTitleStat" />
  </section>

  <div class="mt-10 flex flex-wrap items-end justify-between gap-6">
    <div>
      <SectionLabel>YOUR TEAMS</SectionLabel>
      <div class="mt-4 flex items-center gap-4">
        <IconTile :icon="Users" size="lg" />
        <h1 class="font-display text-4xl break-all">{{ teamHeading }}</h1>
      </div>
    </div>
    <BaseButton to="/teams/new">
      <Plus :size="20" :stroke-width="3" aria-hidden="true" />
      チームを作成
    </BaseButton>
  </div>

  <div class="mt-12 flex items-center justify-between gap-4">
    <h2 class="font-display text-xl">参加しているチーム</h2>
    <StatusChip v-if="!isPending && !loadError" tone="ink" class="px-3.5 py-1 text-sm">
      {{ activeTeams.length }} TEAMS
    </StatusChip>
  </div>

  <p v-if="isPending" class="mt-6 text-sm text-ink/60">読み込み中…</p>
  <p v-else-if="loadError" role="alert" class="mt-6 text-sm font-bold text-red-600">
    チーム一覧の取得に失敗しました。
  </p>
  <p v-else-if="activeTeams.length === 0" class="mt-6 text-sm text-ink/60">
    まだ所属チームがありません。「チームを作成」から始めましょう。
  </p>
  <ul v-else class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    <TeamCard
      v-for="team in activeTeams"
      :key="team.id"
      :team="team"
      :team-id="team.id"
      :summary="summaries[team.id]"
      :load-failed="failedTeamIds[team.id]"
    />
  </ul>

  <section
    class="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border-[3px] border-dashed border-primary bg-white px-6 py-5"
  >
    <IconTile :icon="Link2" tone="accent" />
    <div class="min-w-56 flex-1">
      <h2 class="font-extrabold">招待コードを受け取ったら</h2>
      <p class="mt-1 text-sm text-ink/70">
        届いたコードを入力して、相手のチームに参加してください。
      </p>
      <p v-if="joinMessage" role="status" class="mt-2 text-sm font-bold text-primary">
        {{ joinMessage }}
      </p>
    </div>
    <BaseButton variant="outline" size="sm" :disabled="isJoining" @click="openJoinDialog">
      <KeyRound :size="16" :stroke-width="2.5" aria-hidden="true" />
      コードで参加
    </BaseButton>
  </section>

  <div class="mt-12 flex items-center justify-between gap-4">
    <h2 class="font-display text-xl">終了したチーム</h2>
    <StatusChip v-if="!isPending && !loadError" tone="ink" class="px-3.5 py-1 text-sm">
      {{ endedTeams.length }} TEAMS
    </StatusChip>
  </div>
  <ul
    v-if="endedTeams.length > 0"
    class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
  >
    <TeamCard
      v-for="team in endedTeams"
      :key="team.id"
      :team="team"
      :team-id="team.id"
      :summary="summaries[team.id]"
    />
  </ul>
  <!-- TODO: 自動消去の処理は未実装（文言だけ）。日数を決めたら scheduler の Functions で削除する -->
  <p
    class="mt-6 rounded-2xl border-[3px] border-dashed border-primary bg-white px-6 py-5 text-sm text-ink/70"
  >
    7日たつと、自動で消去されます。
  </p>

  <Teleport to="body">
    <dialog
      ref="joinDialog"
      aria-labelledby="join-dialog-title"
      class="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border-[3px] border-ink bg-white p-0 text-ink shadow backdrop:bg-ink/50"
      @click.self="closeJoinDialog"
    >
      <form class="flex flex-col gap-4 p-6" @submit.prevent="submitJoin">
        <h2 id="join-dialog-title" class="font-display text-xl">チームに参加</h2>
        <!-- 招待リンク入力などを追加する場合も、この入力領域にまとめる。 -->
        <label class="flex flex-col gap-1.5 text-sm font-bold">
          招待コード
          <input
            v-model="inviteCode"
            type="text"
            required
            maxlength="128"
            autofocus
            class="rounded-xl border-[3px] border-ink px-3 py-2 font-dot text-lg tracking-widest outline-none focus:border-primary"
            :disabled="isJoining"
          />
        </label>
        <p v-if="joinError" role="alert" class="text-sm font-bold text-red-600">{{ joinError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="outline" size="sm" @click="closeJoinDialog">キャンセル</BaseButton>
          <BaseButton type="submit" size="sm" :disabled="isJoining || !inviteCode.trim()">
            {{ isJoining ? '参加中…' : '参加' }}
          </BaseButton>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
