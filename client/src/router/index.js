import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue') },
  { path: '/lobby', name: 'Lobby', component: () => import('../views/Lobby.vue') },
  { path: '/room/:id', name: 'RoomDetail', component: () => import('../views/RoomDetail.vue') },
  { path: '/new-post', name: 'NewPost', component: () => import('../views/NewPost.vue') },
  { path: '/user/:id', name: 'UserPublic', component: () => import('../views/UserPublic.vue') },
  { path: '/create-room', name: 'CreateRoom', component: () => import('../views/CreateRoom.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;