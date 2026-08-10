<template>
  <div class="room-detail" v-if="room">
    <NavBar />
    <h1>{{ room.title }}</h1>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="创建者">
        <router-link
          :to="`/user/${room.creator?._id}`"
          style="color: #409eff; text-decoration: none;"
        >
          {{ room.creator?.username }}
        </router-link>
      </el-descriptions-item>
      <el-descriptions-item label="简介">{{ room.description || '无' }}</el-descriptions-item>
      <el-descriptions-item label="在线人数">{{ onlineCount }}</el-descriptions-item>
      <el-descriptions-item label="浏览数">{{ room.views }}</el-descriptions-item>
      <el-descriptions-item label="房间码" :span="2">
        <div style="display: flex; align-items: center;">
          <el-input :value="room.inviteCode" readonly style="flex:1" />
          <el-button type="primary" @click="copyCode" style="margin-left:10px">复制</el-button>
        </div>
      </el-descriptions-item>
    </el-descriptions>

    <div v-if="isCreator" style="margin: 20px 0;">
      <el-button type="danger" @click="deleteRoom">删除房间</el-button>
    </div>

    <el-divider />

    <div class="online-users">
      <h4>在线用户 ({{ onlineUsers.length }})</h4>
      <ul>
        <li v-for="u in onlineUsers" :key="u.userId">
          <router-link
            :to="`/user/${u.userId}`"
            :style="{
              fontWeight: u.userId === room.creator?._id ? 'bold' : 'normal',
              color: '#409eff',
              textDecoration: 'none'
            }"
          >
            {{ u.username }}
          </router-link>
          <span v-if="u.userId === room.creator?._id" style="margin-left: 4px; color: #666;">(房主)</span>
          <el-button
            v-if="isCreator && u.userId !== currentUserId"
            type="danger"
            size="small"
            @click="kickUser(u.userId)"
            style="margin-left: 10px"
          >
            踢出
          </el-button>
        </li>
      </ul>
    </div>

    <div class="chat-box" ref="chatBox">
      <div v-for="(msg, idx) in messages" :key="idx" class="message">
        <span class="sender">{{ msg.senderName }}：</span>
        <span class="content">{{ msg.content }}</span>
        <span class="time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
      </div>
      <el-empty v-if="messages.length === 0" description="暂无消息" />
    </div>

    <div class="presets">
      <el-button
        v-for="preset in presets"
        :key="preset"
        size="small"
        @click="sendMessage(preset)"
        type="info"
        plain
      >
        {{ preset }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { io } from 'socket.io-client';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const route = useRoute();
const router = useRouter();
const room = ref(null);
const onlineCount = ref(0);
const messages = ref([]);
const chatBox = ref(null);
const onlineUsers = ref([]);

const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
const currentUserId = computed(() => currentUser.id);
const isCreator = computed(() => room.value?.creator?._id === currentUserId.value);

const presets = [
  '你好，我想加入会场，请加我微信！',
  '一起打奇象巡展，我这边差一个人。',
  '请问房间还在吗？',
  '交换奇象生物，我有XXX想换YYY。'
];

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://39.105.5.72');

onMounted(async () => {
  try {
    const { data } = await api.get(`/rooms/${route.params.id}`);
    room.value = data;
  } catch (err) {
    ElMessage.error('房间不存在或加载失败');
    return;
  }

  socket.emit('joinRoom', {
    roomId: route.params.id,
    userId: currentUserId.value,
    username: currentUser.username || '游客'
  });

  socket.on('onlineUsers', ({ users }) => {
    onlineUsers.value = users;
  });

  socket.on('userJoined', ({ userId, username }) => {
    onlineUsers.value.push({ userId, username });
  });

  socket.on('userLeft', ({ userId }) => {
    onlineUsers.value = onlineUsers.value.filter(u => u.userId !== userId);
  });

  socket.on('updateOnline', ({ online }) => {
    onlineCount.value = online;
  });

  socket.on('newMessage', (message) => {
    messages.value.push(message);
    nextTick(() => {
      if (chatBox.value) {
        chatBox.value.scrollTop = chatBox.value.scrollHeight;
      }
    });
  });

  socket.on('roomDeleted', ({ roomId }) => {
    ElMessage.error('房间已被房主删除');
    router.push('/lobby');
  });

  socket.on('kicked', ({ msg }) => {
    ElMessage.error(msg);
    socket.disconnect();
    setTimeout(() => {
      window.location.href = '/lobby';
    }, 500);
  });

  socket.on('error', ({ msg }) => {
    if (msg.includes('禁止加入')) {
      ElMessage.error(msg);
      socket.disconnect();
      window.location.href = '/lobby';
    } else {
      ElMessage.error(msg);
    }
  });
});

const sendMessage = (text) => {
  if (!text.trim()) return;
  socket.emit('chatMessage', {
    roomId: route.params.id,
    content: text,
    senderName: currentUser.username || '游客'
  });
};

const kickUser = async (userIdToKick) => {
  try {
    await ElMessageBox.confirm('确定要踢出该用户吗？', '警告', { type: 'warning' });
    socket.emit('kickUser', { userIdToKick, roomId: route.params.id });
  } catch (err) {
    // 取消操作
  }
};

const deleteRoom = async () => {
  try {
    await ElMessageBox.confirm('确定要删除此房间吗？此操作不可恢复！', '警告', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error'
    });
    await api.delete(`/rooms/${room.value._id}`);
    ElMessage.success('房间已删除');
    router.push('/lobby');
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.msg || '删除失败');
    }
  }
};

const copyCode = () => {
  navigator.clipboard.writeText(room.value.inviteCode).then(() => {
    ElMessage.success('房间码已复制');
  });
};
</script>

<style scoped>
.room-detail { max-width: 800px; margin: 20px auto; padding: 20px; }
.chat-box {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin: 16px 0;
  background: #fafafa;
}
.message { margin-bottom: 8px; line-height: 1.5; }
.sender { color: #409eff; font-weight: bold; }
.time { font-size: 12px; color: #999; margin-left: 8px; }
.presets { margin-bottom: 12px; }
.presets .el-button { margin-right: 8px; margin-bottom: 6px; }
.online-users ul { list-style: none; padding: 0; }
.online-users li { margin: 5px 0; }
</style>