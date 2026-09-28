<script setup lang="ts">
import { ref } from 'vue'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/lib/firebase'
import { ensureUserProfile } from '@/composables/useEnsureUserProfile'

const route = useRoute()
const router = useRouter()

const isLoggingIn = ref(false)
const errorMessage = ref('')

async function login() {
  isLoggingIn.value = true
  errorMessage.value = ''
  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
    await ensureUserProfile(user)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'ログインに失敗しました。もう一度お試しください。'
  } finally {
    isLoggingIn.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center gap-4">
    <button
      class="rounded border px-4 py-2 disabled:opacity-50"
      :disabled="isLoggingIn"
      @click="login"
    >
      {{ isLoggingIn ? 'ログイン中…' : 'Googleでログイン' }}
    </button>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
  </div>
</template>
