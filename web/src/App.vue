<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'
import AppLayout from '@/layouts/AppLayout.vue'
import { ensureUserProfile } from '@/composables/useEnsureUserProfile'

const currentUser = useCurrentUser()

// ログイン確定のたびに users/{uid} の存在を確認し、無ければ作成する
watch(
  currentUser,
  (user) => {
    if (user) ensureUserProfile(user)
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
