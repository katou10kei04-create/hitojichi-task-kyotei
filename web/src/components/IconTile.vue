<script setup lang="ts">
import type { Component } from 'vue'

// 角丸の四角にアイコンを入れた飾り。見出しやカードの左上に置く
withDefaults(
  defineProps<{
    icon: Component
    tone?: 'primary' | 'accent' | 'ink' | 'muted'
    size?: 'md' | 'lg'
  }>(),
  { tone: 'primary', size: 'md' },
)

const toneClass = {
  primary: 'bg-primary text-white',
  accent: 'bg-accent text-ink',
  ink: 'bg-ink text-accent',
  muted: 'bg-muted text-ink',
}
const sizeClass = { md: 'size-12 rounded-xl', lg: 'size-14 rounded-2xl' }
const iconSize = { md: 24, lg: 28 }
</script>

<template>
  <span
    class="grid shrink-0 place-items-center border-[3px] border-ink shadow-sm transition"
    :class="[toneClass[tone], sizeClass[size]]"
    aria-hidden="true"
  >
    <component :is="icon" :size="iconSize[size]" :stroke-width="2.5" />
  </span>
</template>
