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

    <!-- 音乐播放器 -->
    <div class="music-player">
      <div class="music-controls">
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

        <el-button
          :icon="isPlaying ? 'VideoPause' : 'VideoPlay'"
          circle
          @click="togglePlay"
          :disabled="!isCreator"
        />

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

        <div style="display: flex; align-items: center; width: 140px;">
          <el-button icon="ArrowDown" circle size="small" @click="volume = Math.max(0, volume-10); changeVolume(volume)" />
          <el-slider v-model="volume" @input="changeVolume" style="flex:1; margin: 0 5px;" :max="100" />
          <el-button icon="ArrowUp" circle size="small" @click="volume = Math.min(100, volume+10); changeVolume(volume)" />
        </div>
      </div>
      <audio
        ref="audioPlayer"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoaded"
        @ended="onEnded"
      />
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

    <div class="chat-box" ref="chatBox">
      <div v-for="(msg, idx) in messages" :key="idx" class="message">
        <span class="sender">{{ msg.senderName }}：</span>
        <span class="content">{{ msg.content }}</span>
        <span class="time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
      </div>
      <el-empty v-if="messages.length === 0" description="暂无消息" />
    </div>

    <!-- 预制消息发送区域 -->
    <div class="input-area">
      <el-input
        v-model="selectedMsg"
        placeholder="请从预制消息中选择..."
        readonly
        @keyup.enter="sendSelected"
      >
        <template #append>
          <el-button @click="sendSelected" :disabled="!selectedMsg.trim()">发送</el-button>
        </template>
      </el-input>
      <el-popover
        placement="top"
        :width="360"
        trigger="click"
        :show-arrow="false"
      >
        <template #reference>
          <el-button type="primary" style="margin-left: 10px;">预制消息</el-button>
        </template>
        <div class="preset-list">
          <div
            v-for="(preset, idx) in presets"
            :key="idx"
            class="preset-item"
            @click="selectPreset(preset)"
          >
            {{ preset }}
          </div>
        </div>
      </el-popover>
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
import { ArrowDown, ArrowUp, VideoPlay, VideoPause } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const room = ref(null);
const onlineCount = ref(0);
const messages = ref([]);
const chatBox = ref(null);
const onlineUsers = ref([]);
const audioPlayer = ref(null);
const selectedMsg = ref(''); // 当前选中的预制消息

const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
const currentUserId = computed(() => currentUser.id);
const isCreator = computed(() => room.value?.creator?._id === currentUserId.value);

// 预制消息列表（无序号）
const presets = [
  '来一场奇象拟合对战吗，斗蛐蛐时间到！',
  '有人交换奇象吗，缺的生物可以拿出来互换～',
  '我正在刷草丛，希望能刷出闪光奇象！',
  '属性克制很关键，对战前记得留意对手阵容。',
  '求三星奇象，有没有博士可以交换图鉴？',
  '欢迎来到奇象巡展，一起来收集奇象生物吧。',
  '诱捕剂已经备好，准备去野外碰碰运气。',
  '刚抓到新奇象，快来看看我的收藏！',
  '巡展像素画已完成，欢迎前来欣赏打分。',
  '快速对决来一把，三局两胜切磋一下。',
  '图鉴还差几只，蹲大佬互通有无。',
  '小心！别被果冻王的人海战术拿捏了。',
  '新区域解锁，这里可以捕捉不一样的奇象。',
  '打完收工，今天的巡展纪念章拿到手啦。',
  '有人一起逛广场，看看其他人的像素作品吗？',
  '奇术、本能、百变，别搞错属性克制关系哦。',
  '这局输了，再来一局，我要调整阵容。',
  '蹲一个稀有奇象，愿意拿多只生物交换。',
  '草丛逛半天啥也没刷到，非酋实锤了。',
  '玩得很尽兴，感谢各位博士的陪伴！',
  '大家好，很高兴来到这个房间！',
  '各位玩得开心，祝大家都刷到稀有奇象。',
  '多谢陪玩，这一局体验非常愉快～',
  '有什么想聊的都可以在房间里说一说。',
  '慢慢来不用急，享受巡展的乐趣就好。',
  '哇，你的奇象收藏好厉害，大开眼界！',
  '如果需要帮忙可以直接在房间喊我。',
  '很高兴认识各位博士，以后常来玩呀。',
  '时间差不多啦，我先准备下线咯，拜拜。',
  '感谢各位的陪伴，期待下次再一起游玩。'
];

// 音乐播放器状态
const playlist = ref([
  { name: '净罪作战主题曲', src: '/music/song1.mp3' },
  { name: '弧光作战主题曲', src: '/music/song2.mp3' },
  { name: '涤墨作战 Swelling Ink', src: '/music/song3.mp3' },
  { name: '音律联觉-熠曲丰碑', src: '/music/song4.mp3' },
  { name: '音律联觉-昔时我见', src: '/music/song5.mp3' }
]);
const currentTrackIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(50);
const progressPercent = ref(0);

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const onTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
    progressPercent.value = duration.value
      ? (audioPlayer.value.currentTime / duration.value) * 100
      : 0;
  }
};

const onLoaded = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration || 0;
  }
};

const onEnded = () => {
  if (isCreator.value) {
    if (currentTrackIndex.value < playlist.value.length - 1) {
      currentTrackIndex.value++;
      changeTrack();
    } else {
      isPlaying.value = false;
    }
  }
};

const initPlayer = async () => {
  await nextTick();
  const track = playlist.value[0];
  if (audioPlayer.value && track) {
    audioPlayer.value.src = track.src;
    audioPlayer.value.load();
  }
};

const changeTrack = () => {
  const track = playlist.value[currentTrackIndex.value];
  if (!audioPlayer.value) return;
  audioPlayer.value.pause();
  audioPlayer.value.src = track.src;
  audioPlayer.value.load();
  if (isPlaying.value) {
    audioPlayer.value.play().catch(() => {});
  }
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
    audioPlayer.value?.play().catch(() => {});
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

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://39.105.5.72');

socket.on('musicSync', ({ action, data }) => {
  if (isCreator.value) return;
  const player = audioPlayer.value;
  if (!player) return;
  switch (action) {
    case 'play':
      player.currentTime = data.currentTime || 0;
      player.play().catch(() => {});
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
        player.pause();
        player.src = track.src;
        player.load();
        if (isPlaying.value) {
          player.play().catch(() => {});
        }
      }
      break;
  }
});

// 选择预制消息
const selectPreset = (text) => {
  selectedMsg.value = text;
};

// 发送当前选中的消息
const sendSelected = () => {
  if (!selectedMsg.value.trim()) return;
  socket.emit('chatMessage', {
    roomId: route.params.id,
    content: selectedMsg.value.trim(),
    senderName: currentUser.username || '游客'
  });
  selectedMsg.value = ''; // 发送后清空输入框
};

onMounted(async () => {
  try {
    const { data } = await api.get(`/rooms/${route.params.id}`);
    room.value = data;
    await nextTick();
    initPlayer();
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

onUnmounted(() => {
  socket.disconnect();
});

const kickUser = async (userIdToKick) => {
  try {
    await ElMessageBox.confirm('确定要踢出该用户吗？', '警告', { type: 'warning' });
    socket.emit('kickUser', { userIdToKick, roomId: route.params.id });
  } catch (err) {}
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
.online-users ul {
  list-style: none;
  padding: 0;
}
.online-users li {
  margin: 5px 0;
}

/* 预制消息发送区域 */
.input-area {
  display: flex;
  align-items: center;
  margin-top: 12px;
}
.preset-list {
  max-height: 300px;
  overflow-y: auto;
}
.preset-item {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}
.preset-item:hover {
  background-color: #f5f7fa;
}
</style>