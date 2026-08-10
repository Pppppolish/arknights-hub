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

    <!-- ========== 音乐播放器面板 ========== -->
    <div class="music-player">
      <div class="music-controls">
        <!-- 歌曲选择（仅房主可用） -->
        <el-select 
          v-model="currentTrackIndex" 
          :disabled="!isCreator" 
          @change="changeTrack" 
          size="small" 
          style="width: 200px; margin-right: 10px;"
        >
          <el-option
            v-for="(track, idx) in playlist"
            :key="idx"
            :label="track.name"
            :value="idx"
          />
        </el-select>

        <!-- 播放/暂停按钮 -->
        <el-button 
          :icon="isPlaying ? 'VideoPause' : 'VideoPlay'" 
          circle 
          @click="togglePlay" 
          :disabled="!isCreator" 
        />

        <!-- 进度条和时间 -->
        <div style="flex: 1; margin: 0 10px; display: flex; align-items: center;">
          <span style="font-size: 12px; width: 40px;">{{ formatTime(currentTime) }}</span>
          <el-slider 
            v-model="progressPercent" 
            :disabled="!isCreator" 
            @change="seekTo" 
            style="flex: 1; margin: 0 10px;"
            :format-tooltip="() => formatTime(currentTime)"
          />
          <span style="font-size: 12px; width: 40px;">{{ formatTime(duration) }}</span>
        </div>

        <!-- 音量控制 -->
        <div style="display: flex; align-items: center; width: 140px;">
          <el-button icon="Microphone" circle size="small" />
          <el-slider 
            v-model="volume" 
            @input="changeVolume" 
            style="flex:1; margin: 0 5px;" 
            :max="100" 
          />
          <el-button icon="Microphone" circle size="small" />
        </div>
      </div>
      <!-- 隐藏的音频元素 -->
      <audio ref="audioPlayer" @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" @ended="onEnded" />
    </div>
    <!-- =================================== -->

    <el-divider />

    <!-- 在线用户列表 -->
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
          <span v-if="u.userId === room.creator?._id"> (房主)</span>
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
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
const audioPlayer = ref(null);

const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
const currentUserId = computed(() => currentUser.id);
const isCreator = computed(() => room.value?.creator?._id === currentUserId.value);

const presets = [
  '你好，我想加入会场，请加我微信！',
  '一起打奇象巡展，我这边差一个人。',
  '请问房间还在吗？',
  '交换奇象生物，我有XXX想换YYY。'
];

// ============= 音乐播放器状态 =============
const playlist = ref([
  { name: '歌曲1', src: '/music/song1.mp3' },
  { name: '歌曲2', src: '/music/song2.mp3' },
  { name: '歌曲3', src: '/music/song3.mp3' }
]);
const currentTrackIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(50);
const progressPercent = ref(0);

// 播放器辅助函数
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const onTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
    progressPercent.value = duration.value ? (audioPlayer.value.currentTime / duration.value) * 100 : 0;
  }
};

const onLoaded = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
    volume.value = audioPlayer.value.volume * 100;
  }
};

const onEnded = () => {
  if (isCreator.value) {
    // 房主自动下一首
    if (currentTrackIndex.value < playlist.value.length - 1) {
      currentTrackIndex.value++;
      changeTrack();
    } else {
      isPlaying.value = false;
    }
  }
};

const changeTrack = () => {
  const track = playlist.value[currentTrackIndex.value];
  if (audioPlayer.value) {
    audioPlayer.value.src = track.src;
    audioPlayer.value.load();
    if (isPlaying.value) {
      audioPlayer.value.play();
    }
  }
  // 只有房主发送控制指令
  if (isCreator.value) {
    socket.emit('musicControl', {
      roomId: route.params.id,
      action: 'changeTrack',
      data: { index: currentTrackIndex.value, track: track }
    });
  }
};

const togglePlay = () => {
  if (!isCreator.value) return;
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    audioPlayer.value?.play();
  } else {
    audioPlayer.value?.pause();
  }
  socket.emit('musicControl', {
    roomId: route.params.id,
    action: isPlaying.value ? 'play' : 'pause',
    data: { currentTime: audioPlayer.value?.currentTime || 0 }
  });
};

const seekTo = (percent) => {
  if (!isCreator.value || !audioPlayer.value || !duration.value) return;
  const newTime = (percent / 100) * duration.value;
  audioPlayer.value.currentTime = newTime;
  socket.emit('musicControl', {
    roomId: route.params.id,
    action: 'seek',
    data: { currentTime: newTime }
  });
};

const changeVolume = (val) => {
  volume.value = val;
  if (audioPlayer.value) {
    audioPlayer.value.volume = val / 100;
  }
};

// ============= Socket 连接与事件 =============
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://39.105.5.72');

// 监听音乐同步事件（非房主或房主其他设备接收）
socket.on('musicSync', ({ action, data }) => {
  if (isCreator.value) return; // 房主自己忽略同步指令
  const player = audioPlayer.value;
  if (!player) return;

  switch (action) {
    case 'play':
      player.currentTime = data.currentTime || 0;
      player.play();
      isPlaying.value = true;
      break;
    case 'pause':
      player.pause();
      isPlaying.value = false;
      break;
    case 'seek':
      if (data.currentTime !== undefined) {
        player.currentTime = data.currentTime;
      }
      break;
    case 'changeTrack':
      if (data.index !== undefined) {
        currentTrackIndex.value = data.index;
        const track = playlist.value[data.index];
        player.src = track.src;
        player.load();
        if (isPlaying.value) {
          player.play();
        }
      }
      break;
  }
});

// 原有的房间内事件监听 (onlineUsers, userJoined, userLeft, updateOnline, newMessage, roomDeleted, kicked, error)
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

  // 初始化音频播放器（设置初始音量，不自动播放）
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value / 100;
  }
});

onUnmounted(() => {
  // 离开页面时断开 socket，避免内存泄漏
  socket.disconnect();
});

// ============= 其他功能函数 =============
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
.room-detail {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}
/* 音乐播放器样式 */
.music-player {
  margin: 20px 0;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 8px;
}
.music-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.chat-box {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin: 16px 0;
  background: #fafafa;
}
.message {
  margin-bottom: 8px;
  line-height: 1.5;
}
.sender {
  color: #409eff;
  font-weight: bold;
}
.time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
.presets {
  margin-bottom: 12px;
}
.presets .el-button {
  margin-right: 8px;
  margin-bottom: 6px;
}
.online-users ul {
  list-style: none;
  padding: 0;
}
.online-users li {
  margin: 5px 0;
}
</style>