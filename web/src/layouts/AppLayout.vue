<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showNav = computed(() => route.name !== 'login')
</script>

<template>
  <div class="min-h-dvh">
    <nav v-if="showNav" class="flex gap-4 border-b px-4 py-3 text-sm">
      <RouterLink to="/">チーム</RouterLink>
      <RouterLink to="/titles">称号</RouterLink>
      <RouterLink to="/profile">プロフィール</RouterLink>
    </nav>
    <main class="p-4">
      <slot />
    </main>
  </div>
</template>
