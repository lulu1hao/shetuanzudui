import { createRouter, createWebHistory } from 'vue-router'
import IndexPage from '../pages/index/index.vue'
import RoomPage from '../pages/room/room.vue'
import TournamentPage from '../pages/tournament/tournament.vue'

const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexPage,
    meta: { transition: 'page-back' }
  },
  {
    path: '/room',
    name: 'room',
    component: RoomPage,
    meta: { transition: 'tournament-slide' }
  },
  {
    path: '/tournament',
    name: 'tournament',
    component: TournamentPage,
    meta: { transition: 'tournament-slide' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
