<template>
  <div class="admin-panel">
    <NavBar />
    <h1>管理后台</h1>
    <el-tabs v-model="activeTab">
      <!-- 在线用户 -->
      <el-tab-pane label="在线用户" name="online">
        <el-table :data="onlineUsers" style="width: 100%">
          <el-table-column prop="username" label="昵称"></el-table-column>
          <el-table-column prop="roomId" label="所在房间ID"></el-table-column>
          <el-table-column prop="socketId" label="Socket ID" width="220"></el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <el-table :data="users" style="width: 100%">
          <el-table-column prop="username" label="昵称"></el-table-column>
          <el-table-column prop="gameAccount" label="游戏ID"></el-table-column>
          <el-table-column prop="wechat" label="微信"></el-table-column>
          <el-table-column prop="qq" label="QQ"></el-table-column>
          <el-table-column prop="isAdmin" label="管理员" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isAdmin ? 'success' : 'info'">{{ row.isAdmin ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" @click="editUser(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteUser(row._id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 房间管理 -->
      <el-tab-pane label="房间管理" name="rooms">
        <el-table :data="rooms" style="width: 100%">
          <el-table-column prop="title" label="标题"></el-table-column>
          <el-table-column prop="creator.username" label="创建者"></el-table-column>
          <el-table-column prop="views" label="浏览数"></el-table-column>
          <el-table-column prop="currentOnline" label="当前在线"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="deleteRoom(row._id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 帖子管理 -->
      <el-tab-pane label="帖子管理" name="posts">
        <el-table :data="posts" style="width: 100%">
          <el-table-column prop="author.username" label="作者"></el-table-column>
          <el-table-column prop="content" label="内容" show-overflow-tooltip></el-table-column>
          <el-table-column prop="createdAt" label="发布时间" width="160">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="deletePost(row._id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="游戏ID"><el-input v-model="editForm.gameAccount" /></el-form-item>
        <el-form-item label="微信"><el-input v-model="editForm.wechat" /></el-form-item>
        <el-form-item label="QQ"><el-input v-model="editForm.qq" /></el-form-item>
        <el-form-item label="管理员">
          <el-switch v-model="editForm.isAdmin" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const activeTab = ref('online');
const onlineUsers = ref([]);
const users = ref([]);
const rooms = ref([]);
const posts = ref([]);
const editDialogVisible = ref(false);
const editForm = ref({ _id: '', gameAccount: '', wechat: '', qq: '', isAdmin: false });

const fetchOnline = async () => {
  try { const { data } = await api.get('/admin/online'); onlineUsers.value = data; } catch {}
};
const fetchUsers = async () => {
  try { const { data } = await api.get('/admin/users'); users.value = data; } catch {}
};
const fetchRooms = async () => {
  try { const { data } = await api.get('/admin/rooms'); rooms.value = data; } catch {}
};
const fetchPosts = async () => {
  try { const { data } = await api.get('/admin/posts'); posts.value = data; } catch {}
};

const deleteUser = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该用户吗？', '警告', { type: 'warning' });
    await api.delete(`/admin/users/${id}`);
    ElMessage.success('已删除');
    fetchUsers();
  } catch {}
};
const deleteRoom = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该房间吗？', '警告', { type: 'warning' });
    await api.delete(`/admin/rooms/${id}`);
    ElMessage.success('已删除');
    fetchRooms();
  } catch {}
};
const deletePost = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该帖子吗？', '警告', { type: 'warning' });
    await api.delete(`/admin/posts/${id}`);
    ElMessage.success('已删除');
    fetchPosts();
  } catch {}
};

const editUser = (row) => {
  editForm.value = { ...row };
  editDialogVisible.value = true;
};
const saveUser = async () => {
  try {
    await api.put(`/admin/users/${editForm.value._id}`, editForm.value);
    ElMessage.success('更新成功');
    editDialogVisible.value = false;
    fetchUsers();
  } catch (err) {
    ElMessage.error(err.response?.data?.msg || '更新失败');
  }
};

let timer;
onMounted(() => {
  fetchOnline();
  fetchUsers();
  fetchRooms();
  fetchPosts();
  timer = setInterval(fetchOnline, 5000);
});
onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.admin-panel { padding: 20px; max-width: 1200px; margin: 0 auto; }
</style>