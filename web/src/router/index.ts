import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from 'vuefire'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/', name: 'teams', component: () => import('@/views/TeamListView.vue') },
    { path: '/teams/new', name: 'team-new', component: () => import('@/views/TeamNewView.vue') },
    {
      path: '/teams/:teamId',
      name: 'team-tasks',
      component: () => import('@/views/TeamTasksView.vue'),
      props: true,
    },
    { path: '/titles', name: 'titles', component: () => import('@/views/TitleListView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
  ],
})

// 未ログインならログイン画面へ
router.beforeEach(async (to) => {
  if (to.name === 'login') return
  const user = await getCurrentUser()
  if (!user) return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
