<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

// 縁取り＋ベタ影のゲーム風ボタン。to を渡すとページ遷移用のリンクになる
const props = withDefaults(
  defineProps<{
    variant?: 'accent' | 'primary' | 'outline'
    size?: 'sm' | 'md'
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'accent', size: 'md', to: undefined, type: 'button', disabled: false },
)

const variantClass = {
  accent: 'bg-accent text-ink',
  primary: 'bg-primary text-white',
  outline: 'bg-white text-ink',
}
const sizeClass = {
  sm: 'gap-1.5 rounded-xl px-4 py-1.5 text-sm',
  md: 'gap-2 rounded-2xl px-6 py-3 text-base',
}

const classes = computed(() => [
  'inline-flex shrink-0 items-center justify-center border-[3px] border-ink font-display shadow-sm transition',
  'hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none',
  'disabled:pointer-events-none disabled:opacity-50',
  variantClass[props.variant],
  sizeClass[props.size],
])
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes"><slot /></RouterLink>
  <button v-else :type="type" :disabled="disabled" :class="classes"><slot /></button>
</template>
