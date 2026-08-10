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
  </el-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/api';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const activePath = computed(() => route.path);

const goMyRoom = async () => {
  try {
    const { data } = await api.get('/rooms/lobby?mine=true'); // 我们需要一个简单接口获取我的活跃房间
    // 由于没有专门接口，我们可以在 rooms 路由增加一个查询参数，或者新建一个 /rooms/my-room 接口。
    // 但最方便的是在大厅列表接口中增加 mine 参数，然后直接跳转。
    // 这里我们先发送一个请求到后端 (我们待会调整rooms路由支持mine)
    const res = await api.get('/rooms/mine'); // 暂时用这个，我们需要新建接口
    // 如果没有房间，后端会返回404或空
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
</script>

<style scoped>
.nav-bar {
  margin-bottom: 20px;
}
</style>