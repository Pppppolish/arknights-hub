import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus'; // 新增

const routes = [
  // ... 你原有的所有路由 ...
  { path: '/admin', name: 'AdminPanel', component: () => import('../views/AdminPanel.vue'), meta: { requiresAdmin: true } }
];

const router = createRouter({...});

// 添加导航守卫
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