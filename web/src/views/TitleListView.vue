<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useCurrentUser } from 'vuefire'
import { Check, Crown, Lock, Skull, Star, Trophy, X } from 'lucide-vue-next'
import { isAchievementTitle } from '@hitojichi/shared'
import { useTitles } from '@/composables/useTitles'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useTeams } from '@/composables/useTeams'
import { useCompletedTaskCount } from '@/composables/useCompletedTaskCount'
import { useOverdueTasks } from '@/composables/useOverdueTasks'
import BaseButton from '@/components/BaseButton.vue'
import IconTile from '@/components/IconTile.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import StatusChip from '@/components/StatusChip.vue'
import TeamProgressBar from '@/components/TeamProgressBar.vue'

const currentUser = useCurrentUser()
const { titles } = useTitles()
const { profile, updateEquippedTitle } = useCurrentUserProfile()
const { teams } = useTeams()
const teamIds = () => teams.value.map((team) => team.id)
const { count: completedCount } = useCompletedTaskCount(teamIds)
const { ownerIdsByTeam, pending: overduePending, failed: overdueFailed } = useOverdueTasks(teamIds)

const ownedTitleIds = computed(() => new Set(profile.value?.titleIds ?? []))

// ---- 実績：獲得はFunctionsが titleIds に入れたかで判定し、ゲージは今の完了タスク数で出す ----
const achievementsPending = computed(() => titles.pending.value || profile.pending.value)
const achievementsError = computed(() => titles.error.value || profile.error.value)
const achievements = computed(() =>
  titles.value
    .filter(isAchievementTitle)
    .map((title) => {
      const required = title.requiredDoneCount ?? 1
      const owned = ownedTitleIds.value.has(title.id)
      // 獲得後にタスクを消しても、獲得済みならゲージは満タンで見せる
      const current = owned ? required : Math.min(completedCount.value, required)
      return { ...title, id: title.id, required, owned, current }
    })
    .sort((a, b) => a.required - b.required),
)

// ---- プロフィールに称号を設定（獲得済みの実績から選ぶ） ----
const ownedAchievements = computed(() => achievements.value.filter((title) => title.owned))
const equippedTitle = computed(() =>
  titles.value.find((title) => title.id === profile.value?.equippedTitleId),
)
const equipDialog = ref<HTMLDialogElement | null>(null)
const equipDialogHeadingId = useId()
const isEquipping = ref(false)
const equipError = ref('')

function openEquipDialog() {
  equipError.value = ''
  equipDialog.value?.showModal()
}

async function equip(titleId: string | null) {
  if (isEquipping.value) return
  equipError.value = ''
  isEquipping.value = true
  try {
    await updateEquippedTitle({ equippedTitleId: titleId })
    equipDialog.value?.close()
  } catch (error) {
    console.error(error)
    equipError.value = '称号の設定に失敗しました。もう一度お試しください。'
  } finally {
    isEquipping.value = false
  }
}

// ---- dis称号：チームに期限切れタスクがあれば発動中。発動中のものだけ並べる ----
const disPending = computed(() => teams.pending.value || overduePending.value)
const disError = computed(() => teams.error.value || overdueFailed.value)
const activeDisTitles = computed(() => {
  const uid = currentUser.value?.uid
  if (!uid) return []
  const titleName = (id: string) =>
    titles.value.find((title) => title.id === id)?.name ?? '称号が見つかりません'
  return teams.value.flatMap((team) => {
    const ownerIds = ownerIdsByTeam.value[team.id] ?? []
    const cards = []
    // 自分のタスクが期限切れ → 自分に dis称号
    if (ownerIds.includes(uid)) {
      cards.push({
        key: `${team.id}-self`,
        label: 'dis称号',
        name: titleName(team.selfDisTitleId),
        teamName: team.name,
        release: '自分の未達成が解消されると解除',
      })
    }
    // 相棒のタスクが期限切れ → 人質の自分に team dis称号
    if (ownerIds.some((id) => id !== uid)) {
      cards.push({
        key: `${team.id}-team`,
        label: 'Team dis称号',
        name: titleName(team.teamDisTitleId),
        teamName: team.name,
        release: '相棒の未達成が解消されると解除',
      })
    }
    return cards
  })
})
</script>

<template>
  <SectionLabel>YOUR TITLES</SectionLabel>
  <div class="mt-4 flex items-center gap-4">
    <IconTile :icon="Trophy" size="lg" />
    <h1 class="font-display text-4xl">称号</h1>
  </div>

  <!-- 実績 -->
  <h2 class="mt-10 font-display text-xl">実績</h2>

  <p v-if="achievementsPending" class="mt-6 text-sm text-ink/60">読み込み中…</p>
  <p v-else-if="achievementsError" role="alert" class="mt-6 text-sm font-bold text-red-600">
    称号の取得に失敗しました。
  </p>
  <p v-else-if="achievements.length === 0" class="mt-6 text-sm text-ink/60">
    まだ実績の称号が登録されていません。
  </p>
  <ul v-else class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    <li
      v-for="title in achievements"
      :key="title.id"
      class="flex min-w-0 flex-col rounded-2xl border-[3px] border-ink p-6 shadow"
      :class="title.owned ? 'bg-white' : 'bg-canvas'"
    >
      <div class="flex items-start justify-between gap-2">
        <IconTile :icon="title.owned ? Crown : Lock" :tone="title.owned ? 'accent' : 'muted'" />
        <StatusChip v-if="title.owned" :icon="Star" tone="primary" class="px-3.5 py-1 text-sm">
          GET!
        </StatusChip>
        <StatusChip v-else class="px-3.5 py-1 text-sm">LOCKED</StatusChip>
      </div>
      <h3 class="mt-5 font-display text-xl break-all" :class="{ 'text-ink/40': !title.owned }">
        {{ title.name }}
      </h3>
      <p class="mt-2 text-sm text-ink/70">{{ title.description }}</p>
      <TeamProgressBar
        class="mt-5"
        :value="Math.round((title.current / title.required) * 100)"
        :tone="title.owned ? 'accent' : 'primary'"
        :label="`${title.name}の達成状況`"
      />
      <p class="mt-3 font-dot text-sm">{{ title.current }} / {{ title.required }} 件</p>
    </li>
  </ul>

  <div class="mt-8 flex flex-wrap items-center gap-4">
    <BaseButton variant="outline" :disabled="achievementsPending" @click="openEquipDialog">
      <Crown :size="20" :stroke-width="2.5" aria-hidden="true" />
      プロフィールに称号を設定
    </BaseButton>
    <p v-if="equippedTitle" class="text-sm text-ink/70">
      装備中：<span class="font-extrabold text-ink">{{ equippedTitle.name }}</span>
    </p>
  </div>

  <!-- dis称号 -->
  <div class="mt-12 flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <IconTile :icon="Skull" tone="ink" />
      <h2 class="font-display text-2xl">dis称号</h2>
    </div>
    <StatusChip v-if="!disPending && !disError" :icon="Lock" tone="ink" class="px-3.5 py-1 text-sm">
      {{ activeDisTitles.length }} 件 発動中
    </StatusChip>
  </div>

  <p v-if="disPending" class="mt-6 text-sm text-ink/60">読み込み中…</p>
  <p v-else-if="disError" role="alert" class="mt-6 text-sm font-bold text-red-600">
    dis称号の状態の取得に失敗しました。
  </p>
  <p
    v-else-if="activeDisTitles.length === 0"
    class="mt-6 rounded-2xl border-[3px] border-dashed border-primary bg-white px-6 py-5 text-sm text-ink/70"
  >
    発動中のdis称号はありません。この調子で期限を守りましょう！
  </p>
  <ul v-else class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
    <!-- 影だけ紫にして、発動中の不穏さを出す -->
    <li
      v-for="dis in activeDisTitles"
      :key="dis.key"
      class="flex min-w-0 items-center gap-5 rounded-2xl border-[3px] border-ink bg-ink px-6 py-5 text-white shadow-[0_5px_0_0_var(--color-primary)]"
    >
      <IconTile :icon="Skull" tone="accent" size="lg" />
      <div class="min-w-0">
        <span
          class="inline-block rounded-full px-3 py-1 text-sm font-bold"
          :class="dis.label === 'dis称号' ? 'bg-muted text-ink' : 'bg-primary text-white'"
        >
          {{ dis.label }}
        </span>
        <h3 class="mt-2 font-display text-xl break-all text-accent">{{ dis.name }}</h3>
        <p class="mt-1 text-sm break-all text-white/80">
          発動中 ／ {{ dis.teamName }}・{{ dis.release }}
        </p>
      </div>
    </li>
  </ul>

  <Teleport to="body">
    <dialog
      ref="equipDialog"
      :aria-labelledby="equipDialogHeadingId"
      class="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-[3px] border-ink bg-canvas p-0 text-ink shadow backdrop:bg-ink/60"
      @click.self="equipDialog?.close()"
    >
      <div class="p-5 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-dot text-xs tracking-widest text-primary">EQUIP TITLE</p>
            <h3 :id="equipDialogHeadingId" class="mt-2 font-display text-xl">
              プロフィールに称号を設定
            </h3>
          </div>
          <button
            type="button"
            aria-label="称号の設定を閉じる"
            class="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-white transition hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary"
            @click="equipDialog?.close()"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <p class="mt-3 text-sm text-ink/70">獲得した実績から、プロフィールに出す称号を選べます。</p>
        <p v-if="equipError" role="alert" class="mt-3 text-sm font-bold text-red-600">
          {{ equipError }}
        </p>

        <p v-if="ownedAchievements.length === 0" class="mt-5 text-sm text-ink/60">
          まだ獲得した実績がありません。タスクを達成して称号を手に入れましょう。
        </p>
        <div v-else class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            v-for="title in ownedAchievements"
            :key="title.id"
            type="button"
            :aria-pressed="equippedTitle?.id === title.id"
            :disabled="isEquipping"
            class="rounded-2xl border-[3px] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            :class="
              equippedTitle?.id === title.id
                ? 'border-primary bg-primary/10'
                : 'border-ink bg-white'
            "
            @click="equip(title.id)"
          >
            <span class="flex items-center justify-between gap-2">
              <IconTile :icon="Crown" tone="accent" />
              <span
                v-if="equippedTitle?.id === title.id"
                class="flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-bold text-white"
              >
                <Check :size="13" aria-hidden="true" />装備中
              </span>
            </span>
            <span class="mt-3 block font-display break-all">{{ title.name }}</span>
            <span class="mt-2 block text-xs leading-relaxed text-ink/70">
              {{ title.description }}
            </span>
          </button>
        </div>

        <div v-if="equippedTitle" class="mt-5 flex justify-end">
          <BaseButton variant="outline" size="sm" :disabled="isEquipping" @click="equip(null)">
            称号を外す
          </BaseButton>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
