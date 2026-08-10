<template>
  <div class="lobby-container">
    <NavBar />
    <h1>房间大厅</h1>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <el-button type="success" @click="$router.push('/create-room')">+ 创建房间</el-button>
      <div style="display: flex; align-items: center;">
        <el-input
          v-model="roomSearchInput"
          placeholder="搜索房间..."
          clearable
          @clear="clearRoomSearch"
          @keyup.enter="searchRoom"
          style="width: 250px; margin-right: 10px;"
        />
        <el-button type="primary" @click="searchRoom">搜索房间</el-button>
      </div>
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
      <div style="display: flex; align-items: center;">
        <el-input
          v-model="postSearchInput"
          placeholder="搜索帖子..."
          clearable
          @clear="clearPostSearch"
          @keyup.enter="searchPost"
          style="width: 250px; margin-right: 10px;"
        />
        <el-button type="primary" @click="searchPost">搜索帖子</el-button>
      </div>
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
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const router = useRouter();
const route = useRoute();

const rooms = ref([]);
const posts = ref([]);

// 输入框绑定（与 URL 同步）
const roomSearchInput = ref('');
const postSearchInput = ref('');

// 从 URL 读取初始值
onMounted(() => {
  roomSearchInput.value = route.query.roomSearch || '';
  postSearchInput.value = route.query.postSearch || '';
  fetchRooms();
  fetchPosts();
});

// 监听路由参数变化（例如浏览器前进后退）
watch(
  () => route.query.roomSearch,
  (newVal) => {
    roomSearchInput.value = newVal || '';
    fetchRooms();
  }
);
watch(
  () => route.query.postSearch,
  (newVal) => {
    postSearchInput.value = newVal || '';
    fetchPosts();
  }
);

// 房间搜索触发
const searchRoom = () => {
  const query = { ...route.query };
  if (roomSearchInput.value.trim()) {
    query.roomSearch = roomSearchInput.value.trim();
  } else {
    delete query.roomSearch;
  }
  router.replace({ path: '/lobby', query });
};

// 帖子搜索触发
const searchPost = () => {
  const query = { ...route.query };
  if (postSearchInput.value.trim()) {
    query.postSearch = postSearchInput.value.trim();
  } else {
    delete query.postSearch;
  }
  router.replace({ path: '/lobby', query });
};

// 清空房间搜索
const clearRoomSearch = () => {
  roomSearchInput.value = '';
  searchRoom(); // 触发更新
};

// 清空帖子搜索
const clearPostSearch = () => {
  postSearchInput.value = '';
  searchPost();
};

// 获取房间列表（带搜索参数）
const fetchRooms = async () => {
  try {
    const params = {};
    if (route.query.roomSearch) params.search = route.query.roomSearch;
    const { data } = await api.get('/rooms/lobby', { params });
    rooms.value = data;
  } catch (err) {
    console.error(err);
  }
};

// 获取帖子列表（带搜索参数）
const fetchPosts = async () => {
  try {
    const params = {};
    if (route.query.postSearch) params.search = route.query.postSearch;
    const { data } = await api.get('/posts', { params });
    posts.value = data;
  } catch (err) {
    console.error(err);
  }
};

// 点击房间卡片跳转
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