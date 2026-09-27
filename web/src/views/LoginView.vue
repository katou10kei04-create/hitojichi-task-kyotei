<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/lib/firebase'

const route = useRoute()
const router = useRouter()

async function login() {
  await signInWithPopup(auth, new GoogleAuthProvider())
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.replace(redirect)
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center">
    <button class="rounded border px-4 py-2" @click="login">Googleでログイン</button>
  </div>
</template>
