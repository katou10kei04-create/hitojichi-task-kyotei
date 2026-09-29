<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createTeamInput } from '@hitojichi/shared'
import { useTeams } from '@/composables/useTeams'
import HostageTitleFields from '@/components/HostageTitleFields.vue'

const router = useRouter()
const { createTeam } = useTeams()

const name = ref('')
const selfDisTitleId = ref('')
const teamDisTitleId = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  const parsed = createTeamInput.safeParse({
    name: name.value,
    selfDisTitleId: selfDisTitleId.value,
    teamDisTitleId: teamDisTitleId.value,
  })
  if (!parsed.success) {
    errorMessage.value = 'チーム名（1〜40文字）と人質の称号2つを入力してください。'
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
  <h1 class="text-xl font-bold">新規チーム作成</h1>

  <form class="mt-4 flex max-w-sm flex-col gap-3" @submit.prevent="submit">
    <label class="flex flex-col gap-1 text-sm">
      チーム名
      <input
        v-model="name"
        type="text"
        maxlength="40"
        placeholder="例：もくもく開発班"
        class="rounded border px-3 py-2"
      />
    </label>

    <p class="text-sm font-bold">人質（誰かがサボったときに付く称号）</p>
    <HostageTitleFields
      v-model:self-dis-title-id="selfDisTitleId"
      v-model:team-dis-title-id="teamDisTitleId"
    />

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <button
      type="submit"
      class="rounded border px-4 py-2 font-bold disabled:opacity-50"
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? '作成中…' : 'チームを作成する' }}
    </button>
  </form>
</template>
