<script setup lang="ts">
// チーム進捗度のゲージ（value は 0〜100）
defineProps<{ value: number; label: string }>()
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="value"
    :aria-valuemin="0"
    :aria-valuemax="100"
    class="h-4 overflow-hidden rounded-full border-[3px] border-ink bg-white"
  >
    <div
      class="h-full bg-primary transition-[width] duration-500"
      :style="{ width: `${value}%` }"
    />
  </div>
</template>
