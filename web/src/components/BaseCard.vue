<script setup lang="ts">
// 太い縁取り＋ベタ影のカード。一覧の項目にするときは tag="li" を渡す
withDefaults(defineProps<{ tag?: string }>(), { tag: 'div' })
</script>

<template>
  <component :is="tag" class="rounded-2xl border-[3px] border-ink bg-white shadow">
    <slot />
  </component>
</template>
