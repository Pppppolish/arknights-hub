<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="昵称" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.remember">保持登录状态（下次打开浏览器无需重新登录）</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading" style="width:100%">
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>
      <p class="switch-text">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <el-button type="text" @click="toggleMode">
          {{ isLogin ? '去注册' : '去登录' }}
        </el-button>
      </p>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../utils/api';
import { setItem, setRememberMe } from '../utils/storage';

const router = useRouter();
const isLogin = ref(true);
const loading = ref(false);
const formRef = ref(null);

const form = reactive({
  username: '',
  password: '',
  remember: false   // 新增“记住我”字段
});

const rules = {
  username: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 7, message: '昵称最多7个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  form.username = '';
  form.password = '';
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      const url = isLogin.value ? '/auth/login' : '/auth/register';
      const payload = { username: form.username, password: form.password };
      const { data } = await api.post(url, payload);
      // 根据“记住我”选项决定存储引擎，并保存登录凭证
      setRememberMe(form.remember);
      setItem('token', data.token);
      setItem('user', JSON.stringify(data.user));
      ElMessage.success(isLogin.value ? '登录成功' : '注册成功');
      router.push('/lobby');
    } catch (err) {
      const msg = err.response?.data?.msg || '请求失败';
      ElMessage.error(msg);
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f0f2f5;
}
.login-card {
  width: 400px;
}
.switch-text {
  text-align: center;
  margin-top: 10px;
}
</style>