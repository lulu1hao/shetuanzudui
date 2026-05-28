import { createRouter, createWebHistory } from 'vue-router'
import IndexPage from '../pages/index/index.vue'
import RoomPage from '../pages/room/room.vue'
import TournamentPage from '../pages/tournament/tournament.vue'

const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexPage
  },
  {
    path: '/room',
    name: 'room',
    component: RoomPage
  },
  {
    path: '/tournament',
    name: 'tournament',
    component: TournamentPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
