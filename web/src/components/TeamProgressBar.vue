<script setup lang="ts">
// チーム進捗度のゲージ（value は 0〜100）。称号画面の実績の進み具合にも使う（獲得済みは tone="accent"）
withDefaults(defineProps<{ value: number; label: string; tone?: 'primary' | 'accent' }>(), {
  tone: 'primary',
})
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
      class="h-full transition-[width] duration-500"
      :class="tone === 'accent' ? 'bg-accent' : 'bg-primary'"
      :style="{ width: `${value}%` }"
    />
  </div>
</template>
