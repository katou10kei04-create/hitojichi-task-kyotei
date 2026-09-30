<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { useCurrentUser } from 'vuefire'
import { Check, Crown, Link2, LogOut, Skull, UserRound } from 'lucide-vue-next'
import { updateUserProfileInput } from '@hitojichi/shared'
import { auth } from '@/lib/firebase'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useTitles } from '@/composables/useTitles'
import { useTeams } from '@/composables/useTeams'
import { useCompletedTaskCount } from '@/composables/useCompletedTaskCount'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import IconTile from '@/components/IconTile.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import StatusChip from '@/components/StatusChip.vue'

const router = useRouter()
const currentUser = useCurrentUser()
const { profile, updateProfile } = useCurrentUserProfile()
const { titles } = useTitles()
const { teams } = useTeams()
const {
  count: completedTaskCount,
  pending: completedPending,
  failed: completedFailed,
} = useCompletedTaskCount(() => teams.value.map((team) => team.id))

// プレイヤーカード（左）：保存済みのプロフィールを表示する
const initial = computed(() => profile.value?.displayName.charAt(0) || '?')
const equippedTitle = computed(() =>
  titles.value.find((title) => title.id === profile.value?.equippedTitleId),
)
const ownedTitles = computed(() => {
  const ownedIds = new Set(profile.value?.titleIds ?? [])
  return titles.value.filter((title) => ownedIds.has(title.id))
})
// 装備中の称号は王冠付きで別に出すので、dis称号の並びからは除く
const disTitles = computed(() =>
  ownedTitles.value.filter((title) => title.id !== equippedTitle.value?.id),
)

// カード下の数値。読み込み中は「…」、取得に失敗したら「—」を出す
const completedStat = computed(() => {
  if (teams.error.value || completedFailed.value) return '—'
  if (teams.pending.value || completedPending.value) return '…'
  return String(completedTaskCount.value)
})
const titlesLoadState = computed(() => {
  if (profile.error.value || titles.error.value) return '—'
  if (profile.pending.value || titles.pending.value) return '…'
  return null
})
const titleStat = computed(
  () => titlesLoadState.value ?? `${ownedTitles.value.length}/${titles.value.length}`,
)
// 今の称号マスタはすべてdis称号なので、獲得した称号の数をそのまま出す（チーム一覧のサマリーと同じ数え方）
const disStat = computed(() => titlesLoadState.value ?? String(ownedTitles.value.length))
const stats = computed(() => [
  { label: '達成', value: completedStat.value },
  { label: '称号', value: titleStat.value },
  { label: 'dis', value: disStat.value },
])

// 編集フォーム（右）
const displayName = ref('')
const bio = ref('')
const isSaving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

// プロフィールを読み込めたときに一度だけフォームへ反映する（入力中の内容を上書きしないため）
const isFormReady = ref(false)
watch(
  profile,
  (value) => {
    if (!value || isFormReady.value) return
    displayName.value = value.displayName
    bio.value = value.bio ?? ''
    isFormReady.value = true
  },
  { immediate: true },
)

async function save() {
  if (isSaving.value) return
  errorMessage.value = ''
  savedMessage.value = ''
  const parsed = updateUserProfileInput.safeParse({
    displayName: displayName.value.trim(),
    bio: bio.value.trim(),
  })
  if (!parsed.success) {
    errorMessage.value = '表示名（1〜30文字）と自己紹介（120文字以内）を確認してください。'
    return
  }

  isSaving.value = true
  try {
    await updateProfile(parsed.data)
    displayName.value = parsed.data.displayName
    bio.value = parsed.data.bio ?? ''
    savedMessage.value = 'プロフィールを保存しました。'
  } catch (error) {
    console.error(error)
    errorMessage.value = 'プロフィールの保存に失敗しました。もう一度お試しください。'
  } finally {
    isSaving.value = false
  }
}

// Googleでログインしているときだけ「連携中」を出す（ログイン方法はFirebase Authenticationの情報から判定）
const isGoogleLinked = computed(
  () =>
    currentUser.value?.providerData.some((provider) => provider.providerId === 'google.com') ??
    false,
)

const isLoggingOut = ref(false)
async function logout() {
  isLoggingOut.value = true
  try {
    await signOut(auth)
    await router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}

const inputClass =
  'rounded-xl border-[3px] border-ink bg-white px-4 py-3 font-normal outline-none placeholder:text-ink/40 focus:border-primary'
</script>

<template>
  <SectionLabel>PROFILE</SectionLabel>
  <div class="mt-4 flex items-center gap-4">
    <IconTile :icon="UserRound" size="lg" />
    <h1 class="font-display text-4xl">プロフィール</h1>
  </div>
  <p class="mt-4 text-ink/70">相棒に見せる、あなたの自己紹介。</p>

  <div class="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <section
      class="flex flex-col items-center rounded-3xl border-[3px] border-ink bg-primary px-6 py-8 text-center shadow"
      aria-label="プレイヤーカード"
    >
      <SectionLabel>PLAYER CARD</SectionLabel>

      <img
        v-if="profile?.photoURL"
        :src="profile.photoURL"
        alt=""
        class="mt-5 size-28 rounded-full border-[3px] border-ink object-cover"
      />
      <span
        v-else
        class="mt-5 grid size-28 place-items-center rounded-full border-[3px] border-ink bg-accent font-display text-5xl"
        aria-hidden="true"
      >
        {{ initial }}
      </span>

      <p class="mt-6 font-display text-3xl break-all text-white">
        {{ profile?.displayName ?? '読み込み中…' }}
      </p>

      <ul
        v-if="equippedTitle || disTitles.length > 0"
        class="mt-4 flex flex-col items-center gap-3"
        aria-label="獲得した称号"
      >
        <li v-if="equippedTitle">
          <StatusChip :icon="Crown" tone="accent" class="px-3.5 py-1 text-sm" title="装備中の称号">
            {{ equippedTitle.name }}
          </StatusChip>
        </li>
        <li v-for="title in disTitles" :key="title.id">
          <StatusChip
            :icon="Skull"
            tone="accent"
            class="px-3.5 py-1 text-sm"
            :title="title.description"
          >
            {{ title.name }}
          </StatusChip>
        </li>
      </ul>

      <p class="mt-5 text-sm whitespace-pre-wrap break-all text-white/80">
        {{ profile?.bio || '自己紹介を登録して、相棒に自分を伝えましょう。' }}
      </p>

      <dl class="mt-6 grid w-full grid-cols-3 gap-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex flex-col-reverse rounded-xl border-[3px] border-ink bg-white px-2 py-4"
        >
          <dt class="mt-1 text-xs font-extrabold">{{ stat.label }}</dt>
          <dd class="font-dot text-3xl text-primary">{{ stat.value }}</dd>
        </div>
      </dl>
    </section>

    <BaseCard class="p-6 sm:p-8">
      <form class="flex flex-col gap-6" @submit.prevent="save">
        <h2 class="font-display text-xl">プロフィールを編集</h2>

        <p
          v-if="savedMessage"
          role="status"
          class="flex items-center gap-2 rounded-xl border-[3px] border-primary bg-muted px-4 py-3 text-sm font-bold"
        >
          <Check :size="18" :stroke-width="3" class="shrink-0 text-primary" aria-hidden="true" />
          {{ savedMessage }}
        </p>
        <p v-if="errorMessage" role="alert" class="text-sm font-bold text-red-600">
          {{ errorMessage }}
        </p>

        <label class="flex flex-col gap-2 text-sm font-extrabold">
          表示名
          <input
            v-model="displayName"
            type="text"
            required
            maxlength="30"
            :class="inputClass"
            :disabled="!isFormReady || isSaving"
          />
        </label>

        <label class="flex flex-col gap-2 text-sm font-extrabold">
          自己紹介
          <textarea
            v-model="bio"
            maxlength="120"
            rows="3"
            placeholder="取り組んでいること、得意なことなど"
            class="resize-y"
            :class="inputClass"
            :disabled="!isFormReady || isSaving"
          />
          <span class="text-xs font-normal text-ink/60">{{ bio.length }}/120文字</span>
        </label>

        <label class="flex flex-col gap-2 text-sm font-extrabold">
          <span class="flex flex-wrap items-center gap-2">
            メールアドレス
            <StatusChip v-if="isGoogleLinked" :icon="Link2" tone="accent">
              Googleアカウント連携中
            </StatusChip>
          </span>
          <input
            type="email"
            :value="currentUser?.email ?? ''"
            disabled
            class="rounded-xl border-[3px] border-muted bg-canvas px-4 py-3 font-normal text-ink/60"
          />
          <span class="text-xs font-normal text-ink/60">
            <template v-if="isGoogleLinked">ログインに使っているGoogleアカウントです。</template>
            相手には表示されません。現在は変更できません。
          </span>
        </label>

        <BaseButton
          type="submit"
          variant="primary"
          class="w-full"
          :disabled="!isFormReady || isSaving"
        >
          <Check :size="20" :stroke-width="3" aria-hidden="true" />
          {{ isSaving ? '保存中…' : 'プロフィールを保存' }}
        </BaseButton>
      </form>
    </BaseCard>

    <section
      class="flex flex-wrap items-center gap-4 rounded-2xl border-[3px] border-dashed border-primary bg-white px-6 py-5 lg:col-start-2"
    >
      <IconTile :icon="LogOut" tone="muted" />
      <div class="min-w-40 flex-1">
        <h2 class="font-extrabold">ログアウト</h2>
        <p class="mt-1 text-sm text-ink/70">この端末でのログインを終了します。</p>
      </div>
      <BaseButton variant="outline" size="sm" :disabled="isLoggingOut" @click="logout">
        <LogOut :size="16" :stroke-width="2.5" aria-hidden="true" />
        {{ isLoggingOut ? 'ログアウト中…' : 'ログアウト' }}
      </BaseButton>
    </section>
  </div>
</template>
