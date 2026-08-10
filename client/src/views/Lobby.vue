<template>
  <div class="lobby-container">
    <NavBar />
    <h1>房间大厅</h1>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <el-button type="success" @click="$router.push('/create-room')">+ 创建房间</el-button>
      <el-input 
        v-model="roomSearch" 
        placeholder="搜索房间..." 
        clearable 
        @clear="fetchRooms" 
        @keyup.enter="fetchRooms"
        style="width: 250px;"
      />
    </div>

    <el-row :gutter="20">
      <el-col :span="8" v-for="room in rooms" :key="room._id">
        <el-card class="room-card" @click="goRoom(room._id)">
          <h3>{{ room.title }}</h3>
          <p>{{ room.description || '暂无简介' }}</p>
          <p>
            <router-link :to="`/user/${room.creator?._id}`" @click.stop>
              <el-tag size="small" type="info">{{ room.creator?.username }}</el-tag>
            </router-link>
            热度: {{ room.hotScore?.toFixed(1) }}
          </p>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="rooms.length === 0" description="暂无房间，快去创建一个吧！" />

    <el-divider />
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>最新帖子</h2>
      <el-input 
        v-model="postSearch" 
        placeholder="搜索帖子..." 
        clearable 
        @clear="fetchPosts" 
        @keyup.enter="fetchPosts"
        style="width: 250px;"
      />
    </div>

    <el-row :gutter="20">
      <el-col :span="24" v-for="post in posts" :key="post._id" style="margin-bottom:15px">
        <el-card>
          <p>
            <el-tag :type="post.type === 'find_people' ? 'warning' : 'success'">
              {{ post.type === 'find_people' ? '寻人' : '交换' }}
            </el-tag>
            <router-link :to="`/user/${post.author?._id}`">
              <small>{{ post.author?.username }}</small>
            </router-link>
            <small> - {{ new Date(post.createdAt).toLocaleString() }}</small>
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
const roomSearch = ref('');
const postSearch = ref('');

const fetchRooms = async () => {
  try {
    const params = {};
    if (roomSearch.value) params.search = roomSearch.value;
    const { data } = await api.get('/rooms/lobby', { params });
    rooms.value = data;
  } catch (err) {
    console.error(err);
  }
};

const fetchPosts = async () => {
  try {
    const params = {};
    if (postSearch.value) params.search = postSearch.value;
    const { data } = await api.get('/posts', { params });
    posts.value = data;
  } catch (err) {
    console.error(err);
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