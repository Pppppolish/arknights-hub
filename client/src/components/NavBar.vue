<template>
  <el-menu 
    :default-active="activePath" 
    mode="horizontal" 
    router 
    background-color="#545c64"
    text-color="#fff"
    active-text-color="#ffd04b"
    class="nav-bar"
  >
    <el-menu-item index="/lobby">大厅</el-menu-item>
    <el-menu-item index="/create-room">创建房间</el-menu-item>
    <el-menu-item @click="goMyRoom">我的房间</el-menu-item>
    <el-menu-item index="/new-post">发布帖子</el-menu-item>
    <el-menu-item index="/profile">个人中心</el-menu-item>
    <!-- 管理员入口，仅当用户 token 中包含 isAdmin: true 时显示 -->
    <el-menu-item v-if="isAdmin" index="/admin">管理后台</el-menu-item>
    <!-- 退出登录 -->
    <el-menu-item @click="logout">退出登录</el-menu-item>
  </el-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/api';
import { ElMessage } from 'element-plus';
import { getItem, removeItem } from '../utils/storage';

const route = useRoute();
const router = useRouter();
const activePath = computed(() => route.path);

// 通过解析 JWT 判断当前用户是否为管理员
const isAdmin = computed(() => {
  const token = getItem('token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.isAdmin === true;
  } catch {
    return false;
  }
});

// 获取我创建的房间（后端已实现 /api/rooms/mine 接口）
const goMyRoom = async () => {
  try {
    const res = await api.get('/rooms/mine');
    if (res.data && res.data._id) {
      router.push(`/room/${res.data._id}`);
    } else {
      ElMessage.info('你还没有创建房间');
    }
  } catch (err) {
    if (err.response && err.response.status === 404) {
      ElMessage.info('你还没有创建房间');
    } else {
      ElMessage.error('获取房间失败');
    }
  }
};

// 退出登录
const logout = () => {
  removeItem('token');
  removeItem('user');
  ElMessage.success('已安全退出');
  router.push('/login');
};
</script>

<style scoped>
.nav-bar {
  margin-bottom: 20px;
}
</style>