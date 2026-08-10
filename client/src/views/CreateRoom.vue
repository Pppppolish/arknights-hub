<template>
  <div class="create-room">
    <NavBar />
    <el-card>
      <h2>创建新房间</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="如：奇象巡展集会" />
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="介绍一下你的房间吧" />
        </el-form-item>
        <el-form-item label="房间码" prop="inviteCode">
          <el-input v-model="form.inviteCode" placeholder="例如：[80llcniknf6nhk]Dr.ding#4863邀请你加入个人会场" />
          <div class="tip">格式：[字母数字]Dr.ding#数字 邀请你加入个人会场</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">立即创建</el-button>
          <el-button @click="router.push('/lobby')">返回大厅</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const router = useRouter();
const formRef = ref(null);
const loading = ref(false);

const form = reactive({
  title: '',
  description: '',
  inviteCode: ''
});

const validateInviteCode = (rule, value, callback) => {
  if (!value) {
    callback(new Error('房间码不能为空'));
  } else if (!/^\[[a-zA-Z0-9]+\][\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9._]+#\d+邀请你加入个人会场$/u.test(value)) {
    callback(new Error('格式不正确，请参考示例'));
  } else if (value.length > 100) {
    callback(new Error('长度不能超过100字符'));
  } else {
    callback();
  }
};

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  inviteCode: [{ required: true, validator: validateInviteCode, trigger: 'blur' }]
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      const { data } = await api.post('/rooms', form);
      ElMessage.success('房间创建成功！');
      router.push(`/room/${data._id}`);
    } catch (err) {
      const msg = err.response?.data?.msg || '创建失败';
      ElMessage.error(msg);
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.create-room { max-width: 600px; margin: 20px auto; padding: 20px; }
.tip { font-size: 12px; color: #999; margin-top: 4px; }
</style>