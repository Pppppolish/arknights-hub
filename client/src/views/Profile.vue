<template>
  <div class="profile-container">
    <NavBar />
    <el-card v-if="user" class="profile-card">
      <h2>个人中心</h2>
      <el-tabs v-model="activeTab">
        <!-- 信息展示 -->
        <el-tab-pane label="资料展示" name="show">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="昵称">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="游戏ID">{{ user.gameAccount || '未填写' }}</el-descriptions-item>
            <el-descriptions-item label="微信">{{ user.showWechat ? user.wechat : '已隐藏' }}</el-descriptions-item>
            <el-descriptions-item label="QQ">{{ user.showQQ ? user.qq : '已隐藏' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 编辑资料（联系方式 + 昵称） -->
        <el-tab-pane label="编辑资料" name="edit">
          <el-form :model="editForm" label-width="120px">
            <el-form-item label="昵称">
              <el-input v-model="editForm.username" maxlength="7" show-word-limit />
            </el-form-item>
            <el-form-item label="游戏ID">
              <el-input v-model="editForm.gameAccount" placeholder="明日方舟账号名" />
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
              <!-- 保存联系方式（同时可更新游戏ID等） -->
              <el-button type="primary" @click="saveProfile" :loading="saving">保存联系方式</el-button>
              <!-- 单独修改昵称 -->
              <el-button @click="changeUsername" style="margin-left: 10px">仅修改昵称</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 修改密码 -->
        <el-tab-pane label="修改密码" name="password">
          <el-form :model="passwordForm" label-width="120px" :rules="passwordRules" ref="passwordFormRef">
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="changingPwd">修改密码</el-button>
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
import NavBar from '../components/NavBar.vue';

const user = ref(null);
const activeTab = ref('show');
const saving = ref(false);
const changingPwd = ref(false);
const passwordFormRef = ref(null);

// 编辑表单：包含昵称和联系方式
const editForm = reactive({
  username: '',
  gameAccount: '',
  wechat: '',
  qq: '',
  showWechat: false,
  showQQ: false,
  showGameAccount: true
});

// 密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: ''
});

// 密码校验规则
const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
};

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/me');
    user.value = data;
    // 填充编辑表单
    editForm.username = data.username;
    editForm.gameAccount = data.gameAccount || '';
    editForm.wechat = data.wechat || '';
    editForm.qq = data.qq || '';
    editForm.showWechat = data.showWechat;
    editForm.showQQ = data.showQQ;
    editForm.showGameAccount = data.showGameAccount;
  } catch (err) {
    ElMessage.error('获取用户信息失败，请重新登录');
  }
});

// 保存联系方式（不含昵称）
const saveProfile = async () => {
  saving.value = true;
  try {
    // 仅提交联系方式相关字段
    const payload = {
      gameAccount: editForm.gameAccount,
      wechat: editForm.wechat,
      qq: editForm.qq,
      showWechat: editForm.showWechat,
      showQQ: editForm.showQQ,
      showGameAccount: editForm.showGameAccount
    };
    const { data } = await api.put('/auth/me', payload);
    user.value = data;
    ElMessage.success('资料已更新');
    activeTab.value = 'show';
  } catch (err) {
    ElMessage.error(err.response?.data?.msg || '更新失败');
  } finally {
    saving.value = false;
  }
};

// 仅修改昵称
const changeUsername = async () => {
  if (!editForm.username) {
    ElMessage.warning('昵称不能为空');
    return;
  }
  try {
    const { data } = await api.put('/auth/username', { username: editForm.username });
    user.value.username = data.user.username;
    ElMessage.success('昵称修改成功');
    // 同步更新 localStorage 中的用户名
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    localUser.username = data.user.username;
    localStorage.setItem('user', JSON.stringify(localUser));
  } catch (err) {
    ElMessage.error(err.response?.data?.msg || '修改昵称失败');
  }
};

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return;
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return;
    changingPwd.value = true;
    try {
      await api.put('/auth/password', passwordForm);
      ElMessage.success('密码修改成功，请重新登录');
      // 清除 token，强制重新登录
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) {
      ElMessage.error(err.response?.data?.msg || '修改失败');
    } finally {
      changingPwd.value = false;
    }
  });
};
</script>

<style scoped>
.profile-container {
  padding: 20px;
}
.profile-card {
  max-width: 600px;
  margin: 0 auto;
}
</style>