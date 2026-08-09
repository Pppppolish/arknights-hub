<template>
  <div class="profile-container">
    <NavBar />
    <el-card v-if="user" class="profile-card">
      <h2>个人中心</h2>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="资料展示" name="show">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
            <el-descriptions-item label="游戏ID">{{ user.gameAccount || '未填写' }}</el-descriptions-item>
            <el-descriptions-item label="微信">{{ user.showWechat ? user.wechat : '已隐藏' }}</el-descriptions-item>
            <el-descriptions-item label="QQ">{{ user.showQQ ? user.qq : '已隐藏' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="编辑资料" name="edit">
          <el-form :model="editForm" label-width="120px">
            <el-form-item label="游戏ID">
              <el-input v-model="editForm.gameAccount" placeholder="你的明日方舟账号名" />
            </el-form-item>
            <el-form-item label="微信">
              <el-input v-model="editForm.wechat" placeholder="微信号" />
            </el-form-item>
            <el-form-item label="QQ">
              <el-input v-model="editForm.qq" placeholder="QQ号" />
            </el-form-item>
            <el-divider>隐私设置</el-divider>
            <el-form-item label="公开微信">
              <el-switch v-model="editForm.showWechat" />
            </el-form-item>
            <el-form-item label="公开QQ">
              <el-switch v-model="editForm.showQQ" />
            </el-form-item>
            <el-form-item label="公开游戏ID">
              <el-switch v-model="editForm.showGameAccount" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveProfile" :loading="saving">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../utils/api';

const user = ref(null);
const activeTab = ref('show');
const saving = ref(false);

const editForm = reactive({
  gameAccount: '',
  wechat: '',
  qq: '',
  showWechat: false,
  showQQ: false,
  showGameAccount: true
});

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/me');
    user.value = data;
    // 填充表单
    Object.assign(editForm, {
      gameAccount: data.gameAccount || '',
      wechat: data.wechat || '',
      qq: data.qq || '',
      showWechat: data.showWechat,
      showQQ: data.showQQ,
      showGameAccount: data.showGameAccount
    });
  } catch (err) {
    ElMessage.error('获取用户信息失败，请重新登录');
  }
});

const saveProfile = async () => {
  saving.value = true;
  try {
    const { data } = await api.put('/auth/me', editForm);
    user.value = data;
    ElMessage.success('资料已更新');
    activeTab.value = 'show'; // 切回展示页
  } catch (err) {
    ElMessage.error('更新失败，请重试');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.profile-container { display: flex; justify-content: center; margin-top: 40px; }
.profile-card { width: 600px; }
</style>