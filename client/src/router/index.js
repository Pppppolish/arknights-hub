import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue') },
  { path: '/lobby', name: 'Lobby', component: () => import('../views/Lobby.vue') },
  { path: '/room/:id', name: 'RoomDetail', component: () => import('../views/RoomDetail.vue') },
  { path: '/new-post', name: 'NewPost', component: () => import('../views/NewPost.vue') },
  { path: '/user/:id', name: 'UserPublic', component: () => import('../views/UserPublic.vue') },
  { path: '/create-room', name: 'CreateRoom', component: () => import('../views/CreateRoom.vue') },
  // 管理员后台路由
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局导航守卫：拦截非管理员访问 /admin
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAdmin) {
    const token = localStorage.getItem('token');
    if (!token) {
      ElMessage.error('请先登录');
      return next('/login');
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.isAdmin) {
        ElMessage.error('无权访问管理后台');
        return next('/lobby');
      }
    } catch (e) {
      ElMessage.error('登录状态异常，请重新登录');
      return next('/login');
    }
  }
  next();
});

export default router;