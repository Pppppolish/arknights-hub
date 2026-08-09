<template>
  <div class="room-detail" v-if="room">
    <NavBar />
    <h1>{{ room.title }}</h1>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="创建者">{{ room.creator?.username }}</el-descriptions-item>
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

    <el-divider />
    
    <!-- 聊天区域 -->
    <div class="chat-box" ref="chatBox">
      <div v-for="(msg, idx) in messages" :key="idx" class="message">
        <span class="sender">{{ msg.senderName }}：</span>
        <span class="content">{{ msg.content }}</span>
        <span class="time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
      </div>
      <el-empty v-if="messages.length === 0" description="暂无消息" />
    </div>

    <!-- 预制消息按钮行 -->
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

    <!-- 自定义消息输入 -->
    <div class="input-area">
      <el-input 
        v-model="inputMsg" 
        placeholder="输入消息..." 
        @keyup.enter="sendMessage(inputMsg)"
        clearable
      >
        <template #append>
          <el-button @click="sendMessage(inputMsg)">发送</el-button>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';
import api from '../utils/api';

const route = useRoute();
const room = ref(null);
const onlineCount = ref(0);
const messages = ref([]);
const inputMsg = ref('');
const chatBox = ref(null);

const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

// 预制消息库（以后可扩展）
const presets = [
  '你好，我想加入会场，请加我微信！',
  '一起打奇象巡展，我这边差一个人。',
  '请问房间还在吗？',
  '交换奇象生物，我有XXX想换YYY。'
];

// 连接 Socket
const socket = io('http://localhost:3000');

onMounted(async () => {
  try {
    const { data } = await api.get(`/rooms/${route.params.id}`);
    room.value = data;
  } catch (err) {
    ElMessage.error('房间不存在或加载失败');
    return;
  }

  // 加入房间频道
  socket.emit('joinRoom', {
    roomId: route.params.id,
    userId: currentUser.id || 'anonymous'
  });

  // 监听在线人数更新
  socket.on('updateOnline', ({ online }) => {
    onlineCount.value = online;
  });

  // 监听新消息
  socket.on('newMessage', (message) => {
    messages.value.push(message);
    // 自动滚动到底部
    nextTick(() => {
      if (chatBox.value) {
        chatBox.value.scrollTop = chatBox.value.scrollHeight;
      }
    });
  });
});

// 发送消息（预制或自定义）
const sendMessage = (text) => {
  if (!text.trim()) return;
  socket.emit('chatMessage', {
    roomId: route.params.id,
    content: text,
    senderName: currentUser.username || '游客'
  });
  inputMsg.value = '';
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
.input-area { margin-top: 12px; }
</style>