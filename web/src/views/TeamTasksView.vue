<script setup lang="ts">
// TODO(ぬ): チームごとのタスク管理
defineProps<{ teamId: string }>()
</script>

<template>
  <h1 class="text-xl font-bold">タスク管理（{{ teamId }}）</h1>
</template>
