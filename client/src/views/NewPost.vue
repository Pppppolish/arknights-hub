<template>
  <div class="new-post">
    <NavBar />
    <el-card>
      <h2>发布帖子</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择帖子类型">
            <el-option label="寻人" value="find_people" />
            <el-option label="交换生物" value="exchange" />
          </el-select>
        </el-form-item>
        <template v-if="form.type">
          <el-form-item :label="label1" prop="keyword1">
            <el-input v-model="form.keyword1" :placeholder="placeholder1" />
          </el-form-item>
          <el-form-item :label="label2" prop="keyword2">
            <el-input v-model="form.keyword2" :placeholder="placeholder2" />
          </el-form-item>
          <el-form-item label="游戏ID" prop="gameId">
            <el-input v-model="form.gameId" placeholder="你的游戏ID" />
          </el-form-item>
          <el-form-item label="额外说明" prop="extra">
            <el-input v-model="form.extra" type="textarea" placeholder="选填，补充信息" />
          </el-form-item>
        </template>
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">发布</el-button>
        </el-form-item>
      </el-form>
      <!-- 实时预览生成的内容 -->
      <div v-if="previewContent" class="preview">
        <h4>预览：</h4>
        <p>{{ previewContent }}</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../utils/api';
import NavBar from '../components/NavBar.vue';

const formRef = ref(null);
const loading = ref(false);

const form = reactive({
  type: '',
  keyword1: '',
  keyword2: '',
  gameId: '',
  extra: ''
});

const rules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  keyword1: [{ required: true, message: '必填' }],
  keyword2: [{ required: true, message: '必填' }],
  gameId: [{ required: true, message: '必填' }]
};

// 根据类型动态改变标签和占位符
const label1 = computed(() => form.type === 'find_people' ? '寻找对象' : '我的东西');
const placeholder1 = computed(() => form.type === 'find_people' ? '如：某博士' : '如：奇象A');
const label2 = computed(() => form.type === 'find_people' ? '目标' : '想换的东西');
const placeholder2 = computed(() => form.type === 'find_people' ? '如：一起刷素材' : '如：奇象B');

// 实时预览内容
const previewContent = computed(() => {
  if (!form.type || !form.keyword1 || !form.keyword2 || !form.gameId) return '';
  let base;
  if (form.type === 'find_people') {
    base = `【寻人】我正在寻找“${form.keyword1}”，目标是“${form.keyword2}”，游戏ID：${form.gameId}。`;
  } else {
    base = `【交换】我有“${form.keyword1}”，想换“${form.keyword2}”，游戏ID：${form.gameId}。`;
  }
  return base + (form.extra ? `补充：${form.extra}` : '');
});

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await api.post('/posts', {
        type: form.type,
        params: {
          keyword1: form.keyword1,
          keyword2: form.keyword2,
          gameId: form.gameId,
          extra: form.extra
        }
      });
      ElMessage.success('帖子发布成功！');
      // 重置表单或跳转到帖子列表
      form.type = '';
      form.keyword1 = '';
      form.keyword2 = '';
      form.gameId = '';
      form.extra = '';
    } catch (err) {
      const msg = err.response?.data?.msg || '发布失败';
      ElMessage.error(msg);
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.new-post { max-width: 600px; margin: 0 auto; padding: 20px; }
.preview { margin-top: 20px; background: #f0f9eb; padding: 12px; border-radius: 4px; }
</style>