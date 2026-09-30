<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarDays, Flag, Flame, Layers, Link2, Users } from 'lucide-vue-next'
import type { Team } from '@hitojichi/shared'
import type { TeamTaskSummary } from '@/composables/useTeamTaskSummaries'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import IconTile from '@/components/IconTile.vue'
import StatusChip from '@/components/StatusChip.vue'
import TeamProgressBar from '@/components/TeamProgressBar.vue'

// チーム一覧の1枚分。タスクの集計は一覧側（useTeamTaskSummaries）で行い、summary で受け取る。
// summary が undefined の間は読み込み中として表示する
const props = defineProps<{
  team: Team
  teamId: string
  summary?: TeamTaskSummary
  loadFailed?: boolean
}>()

// 相手（人質）がまだ参加していなければ「募集中」
const isRecruiting = computed(() => props.team.memberIds.length < 2)

// 進行中は一番近い未完了の期限、終了したチームは最後の期限を出す
const dueDateLabel = computed(() => {
  if (props.loadFailed) return '取得失敗'
  if (!props.summary) return '…'
  const date = props.summary.nextDueAt ?? props.summary.lastDueAt
  if (!date) return 'なし'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
})
</script>

<template>
  <BaseCard tag="li" class="group flex min-w-0 flex-col p-6 transition hover:border-primary">
    <div class="flex items-start justify-between gap-2">
      <IconTile :icon="Layers" tone="muted" class="group-hover:bg-primary group-hover:text-white" />
      <div class="flex flex-wrap justify-end gap-1.5">
        <StatusChip v-if="summary?.ended" :icon="Flag" tone="ink">終了</StatusChip>
        <StatusChip
          v-else-if="isRecruiting"
          :icon="Link2"
          tone="muted"
          title="人質となる相手がまだ参加していません"
        >
          募集中
        </StatusChip>
        <StatusChip v-else :icon="Flame" tone="accent" title="人質となる相手が参加済みです">
          進行中
        </StatusChip>
        <StatusChip :icon="Users">{{ team.memberIds.length }} / 2</StatusChip>
      </div>
    </div>

    <h3 class="mt-5 font-display text-2xl break-all">{{ team.name }}</h3>
    <p
      v-if="team.description?.trim()"
      class="mt-2 text-sm whitespace-pre-wrap break-all text-ink/60"
    >
      {{ team.description }}
    </p>

    <div class="mt-auto pt-5">
      <p v-if="loadFailed" role="alert" class="text-sm font-bold text-red-600">
        進捗の取得に失敗しました。
      </p>
      <p v-else-if="!summary" class="text-sm text-ink/60">進捗を読み込み中…</p>
      <template v-else>
        <div class="flex items-baseline justify-between">
          <span class="font-dot text-sm text-primary">PROGRESS</span>
          <span class="text-sm font-extrabold">{{ summary.done }} / {{ summary.total }} 達成</span>
        </div>
        <TeamProgressBar
          class="mt-3"
          :value="summary.teamProgress"
          :label="`${team.name}のタスク進捗`"
        />
      </template>

      <p v-if="isRecruiting" class="mt-4 text-xs break-all text-ink/60">
        招待コード：<span class="font-dot text-sm tracking-widest text-ink">{{
          team.inviteCode
        }}</span>
      </p>

      <div class="mt-4 flex items-center justify-between gap-3 border-t-2 border-muted pt-4">
        <p class="flex items-center gap-1.5 text-sm font-extrabold">
          <CalendarDays :size="18" aria-hidden="true" />
          期限 {{ dueDateLabel }}
        </p>
        <BaseButton
          :to="`/teams/${teamId}`"
          variant="outline"
          size="sm"
          :aria-label="`${team.name}に入る`"
        >
          入る
          <ArrowRight :size="16" :stroke-width="3" aria-hidden="true" />
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>
