/**
 * Application routes.
 * History mode — backend/firebase.json rewrites all paths to /index.html.
 */
import {createRouter, createWebHistory} from 'vue-router'
import MatchScreen from '@/components/screens/match_screen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'match',
      component: MatchScreen,
    },
  ],
})

export default router
