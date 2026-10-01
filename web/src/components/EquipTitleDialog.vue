<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Crown } from 'lucide-vue-next'
import { isAchievementTitle, type Title } from '@hitojichi/shared'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import BaseButton from '@/components/BaseButton.vue'
import BaseDialog from '@/components/BaseDialog.vue'
import IconTile from '@/components/IconTile.vue'

// 獲得済みの実績から、プロフィールに出す称号を選ぶポップアップ。titles は称号マスタ全件を渡す
const props = defineProps<{ titles: (Title & { id: string })[] }>()
const open = defineModel<boolean>('open', { default: false })

const { profile, updateEquippedTitle } = useCurrentUserProfile()
const ownedAchievements = computed(() => {
  const ownedIds = new Set(profile.value?.titleIds ?? [])
  return props.titles.filter((title) => isAchievementTitle(title) && ownedIds.has(title.id))
})
const equippedTitleId = computed(() => profile.value?.equippedTitleId ?? null)

const isEquipping = ref(false)
const equipError = ref('')
// 開き直したときに前回のエラーを残さない
watch(open, (value) => {
  if (value) equipError.value = ''
})

async function equip(titleId: string | null) {
  if (isEquipping.value) return
  equipError.value = ''
  isEquipping.value = true
  try {
    await updateEquippedTitle({ equippedTitleId: titleId })
    open.value = false
  } catch (error) {
    console.error(error)
    equipError.value = '称号の設定に失敗しました。もう一度お試しください。'
  } finally {
    isEquipping.value = false
  }
}
</script>

<template>
  <BaseDialog v-model:open="open" eyebrow="EQUIP TITLE" title="プロフィールに称号を設定">
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
        :aria-pressed="equippedTitleId === title.id"
        :disabled="isEquipping"
        class="rounded-2xl border-[3px] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        :class="
          equippedTitleId === title.id ? 'border-primary bg-primary/10' : 'border-ink bg-white'
        "
        @click="equip(title.id)"
      >
        <span class="flex items-center justify-between gap-2">
          <IconTile :icon="Crown" tone="accent" />
          <span
            v-if="equippedTitleId === title.id"
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

    <div v-if="equippedTitleId" class="mt-5 flex justify-end">
      <BaseButton variant="outline" size="sm" :disabled="isEquipping" @click="equip(null)">
        称号を外す
      </BaseButton>
    </div>
  </BaseDialog>
</template>
