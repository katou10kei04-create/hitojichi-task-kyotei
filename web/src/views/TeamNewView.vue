<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, KeyRound, Plus, Skull, Users } from 'lucide-vue-next'
import { createTeamInput } from '@hitojichi/shared'
import { useTeams } from '@/composables/useTeams'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import HostageTitleFields from '@/components/HostageTitleFields.vue'
import IconTile from '@/components/IconTile.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import StatusChip from '@/components/StatusChip.vue'

const router = useRouter()
const { createTeam } = useTeams()

const name = ref('')
const description = ref('')
const selfDisTitleId = ref('')
const teamDisTitleId = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  const parsed = createTeamInput.safeParse({
    name: name.value,
    description: description.value,
    selfDisTitleId: selfDisTitleId.value,
    teamDisTitleId: teamDisTitleId.value,
  })
  if (!parsed.success) {
    errorMessage.value =
      'チーム名（1〜40文字）、説明（120文字以内）、人質の称号2つを確認してください。'
    return
  }

  isSubmitting.value = true
  try {
    const teamId = await createTeam(parsed.data)
    await router.push(`/teams/${teamId}`)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'チームの作成に失敗しました。もう一度お試しください。'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-6">
    <div>
      <SectionLabel>NEW TEAM</SectionLabel>
      <div class="mt-4 flex items-center gap-4">
        <IconTile :icon="Users" size="lg" />
        <h1 class="font-display text-3xl sm:text-4xl">新規チーム作成</h1>
      </div>
      <p class="mt-4 text-sm text-ink/70">仲間と一緒に、サボれないチームを作ろう。</p>
    </div>
    <BaseButton to="/" variant="outline" size="sm">
      <ArrowLeft :size="16" :stroke-width="2.5" aria-hidden="true" />
      チーム一覧へ
    </BaseButton>
  </div>

  <!-- 一覧と同じ共通部品を使い、画面幅に合わせて入力カードを縦に並べる。 -->
  <form class="mt-8" @submit.prevent="submit">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <BaseCard tag="section" class="min-w-0 p-5 sm:p-6" aria-labelledby="team-info-heading">
        <div class="flex items-center gap-3">
          <IconTile :icon="Users" tone="muted" />
          <h2 id="team-info-heading" class="font-display text-xl">チーム情報</h2>
        </div>

        <label class="mt-6 flex flex-col gap-2 text-sm font-bold">
          <span class="flex items-center gap-2">
            チーム名
            <StatusChip tone="accent">必須</StatusChip>
          </span>
          <input
            v-model="name"
            type="text"
            maxlength="40"
            placeholder="例：もくもく開発班"
            class="w-full rounded-xl border-[3px] border-ink bg-canvas px-4 py-3 outline-none focus:border-primary"
          />
        </label>

        <label class="mt-5 flex flex-col gap-2 text-sm font-bold">
          <span class="flex items-center gap-2">
            チーム説明
            <StatusChip tone="muted">任意</StatusChip>
          </span>
          <textarea
            v-model="description"
            maxlength="120"
            rows="4"
            placeholder="例：毎週の目標を共有し、一緒に開発を進めるチームです"
            class="w-full resize-y rounded-xl border-[3px] border-ink bg-canvas px-4 py-3 outline-none focus:border-primary"
          />
          <span class="text-right text-xs font-normal text-ink/60">
            {{ description.length }}/120文字
          </span>
        </label>
      </BaseCard>

      <BaseCard tag="section" class="min-w-0 p-5 sm:p-6" aria-labelledby="hostage-heading">
        <div class="flex items-center gap-3">
          <IconTile :icon="Skull" tone="ink" />
          <h2 id="hostage-heading" class="font-display text-xl">人質の称号</h2>
        </div>
        <p class="mt-4 text-sm leading-relaxed text-ink/70">
          誰かがサボったときに、本人と仲間に付く称号を選んでください。
        </p>

        <!-- 共用入力欄の装飾はこの領域に限定し、タスク管理画面には影響させない。 -->
        <div
          class="mt-6 flex flex-col gap-5 [&_label]:gap-2 [&_label]:font-bold [&_select]:w-full [&_select]:rounded-xl [&_select]:border-[3px] [&_select]:border-ink [&_select]:bg-canvas [&_select]:px-4 [&_select]:py-3 [&_select]:outline-none [&_select:focus]:border-primary"
        >
          <HostageTitleFields
            v-model:self-dis-title-id="selfDisTitleId"
            v-model:team-dis-title-id="teamDisTitleId"
          />
        </div>
      </BaseCard>
    </div>

    <div
      class="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border-[3px] border-dashed border-primary bg-white px-5 py-5 sm:px-6"
    >
      <IconTile :icon="KeyRound" tone="accent" />
      <div class="min-w-0 flex-1">
        <p class="font-extrabold">作成したら、仲間を招待しよう</p>
        <p class="mt-1 text-sm leading-relaxed text-ink/70">
          招待コードは自動で発行されます。チーム一覧から確認できます。
        </p>
      </div>
      <BaseButton type="submit" class="w-full sm:w-auto" :disabled="isSubmitting">
        <Plus :size="20" :stroke-width="3" aria-hidden="true" />
        {{ isSubmitting ? '作成中…' : 'チームを作成する' }}
      </BaseButton>
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      class="mt-5 rounded-xl border-2 border-ink bg-white px-4 py-3 text-sm font-bold text-red-600"
    >
      {{ errorMessage }}
    </p>
  </form>
</template>
