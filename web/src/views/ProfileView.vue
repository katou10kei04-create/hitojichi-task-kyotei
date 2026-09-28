<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { Award, LogOut, Pencil, UserRound } from 'lucide-vue-next'
import { auth } from '@/lib/firebase'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useTitles } from '@/composables/useTitles'

const router = useRouter()

const { profile, updateDisplayName } = useCurrentUserProfile()
const { titles } = useTitles()

const ownedTitles = computed(() => {
  const ownedIds = new Set(profile.value?.titleIds ?? [])
  return titles.value.filter((title) => ownedIds.has(title.id))
})

const isEditing = ref(false)
const displayNameDraft = ref('')
const isSaving = ref(false)
const errorMessage = ref('')

watch(
  () => profile.value?.displayName,
  (name) => {
    if (!isEditing.value) displayNameDraft.value = name ?? ''
  },
  { immediate: true },
)

function startEditing() {
  displayNameDraft.value = profile.value?.displayName ?? ''
  errorMessage.value = ''
  isEditing.value = true
}

async function saveDisplayName() {
  errorMessage.value = ''
  isSaving.value = true
  try {
    await updateDisplayName(displayNameDraft.value)
    isEditing.value = false
  } catch (error) {
    console.error(error)
    errorMessage.value = '表示名を1〜30文字で入力してください。'
  } finally {
    isSaving.value = false
  }
}

async function logout() {
  await signOut(auth)
  await router.push('/login')
}
</script>

<template>
  <h1 class="text-xl font-bold">プロフィール</h1>

  <div class="mt-4 flex items-center gap-4">
    <img
      v-if="profile?.photoURL"
      :src="profile.photoURL"
      alt=""
      class="size-16 rounded-full border object-cover"
    />
    <UserRound v-else :size="64" class="rounded-full border p-2 text-gray-400" />

    <div class="flex-1">
      <form v-if="isEditing" class="flex items-center gap-2" @submit.prevent="saveDisplayName">
        <input
          v-model="displayNameDraft"
          type="text"
          maxlength="30"
          class="rounded border px-3 py-1.5"
        />
        <button
          type="submit"
          class="rounded border px-3 py-1.5 text-sm font-bold disabled:opacity-50"
          :disabled="isSaving"
        >
          {{ isSaving ? '保存中…' : '保存' }}
        </button>
        <button type="button" class="text-sm text-gray-500" @click="isEditing = false">
          キャンセル
        </button>
      </form>
      <div v-else class="flex items-center gap-2">
        <span class="text-lg font-bold">{{ profile?.displayName ?? '読み込み中…' }}</span>
        <button class="text-gray-400 hover:text-gray-600" @click="startEditing">
          <Pencil :size="16" />
        </button>
      </div>
      <p v-if="errorMessage" class="mt-1 text-sm text-red-600">{{ errorMessage }}</p>
    </div>
  </div>

  <section class="mt-8">
    <h2 class="flex items-center gap-1 text-sm font-bold text-gray-500">
      <Award :size="16" />
      獲得した称号
    </h2>
    <p v-if="ownedTitles.length === 0" class="mt-2 text-sm text-gray-500">
      まだ称号を獲得していません。
    </p>
    <ul v-else class="mt-2 flex flex-col gap-2">
      <li v-for="title in ownedTitles" :key="title.id" class="rounded border px-4 py-3">
        <span class="font-bold">{{ title.name }}</span>
        <p class="text-xs text-gray-500">{{ title.description }}</p>
      </li>
    </ul>
  </section>

  <button
    class="mt-8 flex items-center gap-1 rounded border px-4 py-2 text-sm font-bold"
    @click="logout"
  >
    <LogOut :size="16" />
    ログアウト
  </button>
</template>
