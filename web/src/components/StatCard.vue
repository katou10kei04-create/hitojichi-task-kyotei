<script setup lang="ts">
import type { Component } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import IconTile from '@/components/IconTile.vue'

// 「達成タスク 1件」のような数値サマリー。unit を省くと value だけ表示する（読み込み中など）
defineProps<{
  icon: Component
  tone: 'primary' | 'accent' | 'ink' | 'muted'
  label: string
  value: string
  unit?: string
}>()
</script>

<template>
  <BaseCard class="flex min-w-0 items-center gap-4 px-6 py-5">
    <IconTile :icon="icon" :tone="tone" />
    <dl class="min-w-0">
      <dt class="text-xs font-bold text-ink/60">{{ label }}</dt>
      <dd class="mt-1 font-display text-2xl break-all">
        {{ value
        }}<span v-if="unit" class="ml-1 font-sans text-base font-extrabold">{{ unit }}</span>
      </dd>
    </dl>
  </BaseCard>
</template>
