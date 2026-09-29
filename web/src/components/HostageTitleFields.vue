<script setup lang="ts">
import { computed } from 'vue'
import { useTitles } from '@/composables/useTitles'

// 人質（dis称号・team dis称号）を称号マスタから選ぶ入力欄。チーム作成と人質変更で共用する
const selfDisTitleId = defineModel<string>('selfDisTitleId', { required: true })
const teamDisTitleId = defineModel<string>('teamDisTitleId', { required: true })

const { titles } = useTitles()
const sortedTitles = computed(() => [...titles.value].sort((a, b) => b.shameLevel - a.shameLevel))
</script>

<template>
  <label class="flex flex-col gap-1 text-sm">
    dis称号（サボった本人に付く）
    <select v-model="selfDisTitleId" class="rounded border px-3 py-2">
      <option value="" disabled>選択してください</option>
      <option v-for="title in sortedTitles" :key="title.id" :value="title.id">
        {{ title.name }}
      </option>
    </select>
  </label>
  <label class="flex flex-col gap-1 text-sm">
    team dis称号（サボった人の仲間に付く）
    <select v-model="teamDisTitleId" class="rounded border px-3 py-2">
      <option value="" disabled>選択してください</option>
      <option v-for="title in sortedTitles" :key="title.id" :value="title.id">
        {{ title.name }}
      </option>
    </select>
  </label>
</template>
