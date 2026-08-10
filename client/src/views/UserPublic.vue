<template>
  <div class="user-public">
    <NavBar />
    <el-card v-if="user" class="user-card">
      <h2>{{ user.username }} 的主页</h2>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="昵称">{{ user.username }}</el-descriptions-item>
        <el-descriptions-item label="游戏ID">{{ user.gameAccount || '未填写' }}</el-descriptions-item>
        <el-descriptions-item label="微信">{{ user.wechat || '未填写' }}</el-descriptions-item>
        <el-descriptions-item label="QQ">{{ user.qq || '未填写' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ new Date(user.createdAt).toLocaleString() }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
    <el-empty v-else description="用户不存在" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const route = useRoute();
const user = ref(null);

onMounted(async () => {
  try {
    const { data } = await api.get(`/users/${route.params.id}/public`);
    user.value = data;
  } catch (err) {
    console.error(err);
  }
});
</script>

<style scoped>
.user-public {
  padding: 20px;
}
.user-card {
  max-width: 600px;
  margin: 0 auto;
}
</style>