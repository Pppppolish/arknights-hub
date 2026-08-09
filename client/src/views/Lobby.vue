<template>
  <div class="lobby-container">
    <NavBar />
    <h1>房间大厅</h1>
    <el-button type="success" @click="$router.push('/create-room')" style="margin-bottom:20px">+ 创建房间</el-button>
    
    <!-- 房间列表 -->
    <el-row :gutter="20">
      <el-col :span="8" v-for="room in rooms" :key="room._id">
        <el-card class="room-card" @click="goRoom(room._id)">
          <h3>{{ room.title }}</h3>
          <p>{{ room.description || '暂无简介' }}</p>
          <p>
            <el-tag size="small">{{ room.creator?.username }}</el-tag>
            热度: {{ room.hotScore?.toFixed(1) }}
          </p>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="rooms.length === 0" description="暂无房间，快去创建一个吧！" />

    <el-divider />
    <h2>最新帖子</h2>
    
    <!-- 帖子列表 -->
    <el-row :gutter="20">
      <el-col :span="24" v-for="post in posts" :key="post._id" style="margin-bottom:15px">
        <el-card>
          <p>
            <el-tag :type="post.type === 'find_people' ? 'warning' : 'success'">
              {{ post.type === 'find_people' ? '寻人' : '交换' }}
            </el-tag>
            <small>{{ post.author?.username }} - {{ new Date(post.createdAt).toLocaleString() }}</small>
          </p>
          <p>{{ post.content }}</p>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="posts.length === 0" description="暂无帖子" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const router = useRouter();
const rooms = ref([]);
const posts = ref([]);

// 获取房间列表
const fetchRooms = async () => {
  try {
    const { data } = await api.get('/rooms/lobby');
    rooms.value = data;
  } catch (err) {
    console.error('获取房间列表失败:', err);
  }
};

// 获取帖子列表
const fetchPosts = async () => {
  try {
    const { data } = await api.get('/posts');
    posts.value = data;
  } catch (err) {
    console.error('获取帖子列表失败:', err);
  }
};

onMounted(() => {
  fetchRooms();
  fetchPosts();
});

const goRoom = (id) => {
  router.push(`/room/${id}`);
};
</script>

<style scoped>
.lobby-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.room-card {
  cursor: pointer;
  margin-bottom: 20px;
  transition: transform 0.2s;
}
.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>