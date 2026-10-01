<script setup lang="ts">
import type { Component } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import IconTile from '@/components/IconTile.vue'

// 「達成タスク 1件」のような数値サマリー。unit を省くと value だけ表示する（読み込み中など）
// クリックで詳細を開けるよう、カード全体をボタンにしている（click イベントで受け取る）
defineProps<{
  icon: Component
  tone: 'primary' | 'accent' | 'ink' | 'muted'
  label: string
  value: string
  unit?: string
}>()
defineEmits<{ click: [] }>()
</script>

<template>
  <BaseCard
    tag="button"
    type="button"
    class="flex w-full min-w-0 items-center gap-4 px-6 py-5 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-0.5 active:shadow-none"
    @click="$emit('click')"
  >
    <IconTile :icon="icon" :tone="tone" />
    <span class="min-w-0">
      <span class="block text-xs font-bold text-ink/60">{{ label }}</span>
      <span class="mt-1 block font-display text-2xl break-all">
        {{ value
        }}<span v-if="unit" class="ml-1 font-sans text-base font-extrabold">{{ unit }}</span>
      </span>
    </span>
  </BaseCard>
</template>
