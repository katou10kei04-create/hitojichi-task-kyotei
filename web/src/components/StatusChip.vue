<script setup lang="ts">
import type { Component } from 'vue'

// 「募集中」「1 / 2」などの小さな丸いラベル
withDefaults(
  defineProps<{
    icon?: Component
    tone?: 'outline' | 'muted' | 'accent' | 'ink' | 'primary'
  }>(),
  { icon: undefined, tone: 'outline' },
)

const toneClass = {
  outline: 'border-ink bg-white text-ink',
  muted: 'border-ink bg-muted text-ink',
  accent: 'border-ink bg-accent text-ink',
  ink: 'border-ink bg-ink text-accent',
  primary: 'border-ink bg-primary text-white',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap"
    :class="toneClass[tone]"
  >
    <component :is="icon" v-if="icon" :size="14" :stroke-width="2.5" aria-hidden="true" />
    <slot />
  </span>
</template>
