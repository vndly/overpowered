/**
 * Application routes.
 * History mode — backend/firebase.json rewrites all paths to /index.html.
 */
import {createRouter, createWebHistory} from 'vue-router'
import HomeScreen from '@/components/screens/home_screen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeScreen,
    },
  ],
})

// The engine verification screen is a development tool and never ships: the route only
// exists under DEV, and the dynamic import keeps the component out of the built bundle.
if (import.meta.env.DEV) {
  router.addRoute({
    path: '/verify',
    name: 'verify',
    component: () => import('@/components/screens/verify_screen.vue'),
  })
}

export default router
