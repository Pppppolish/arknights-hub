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

        <!-- 寻人类型的表单 -->
        <template v-if="form.type === 'find_people'">
          <el-form-item label="寻找对象" prop="keyword1">
            <el-input
              v-model="form.keyword1"
              placeholder="如：(B服)Dr.Polishes#3167"
              clearable
            />
          </el-form-item>
          <el-form-item label="目标" prop="keyword2">
            <el-select
              v-model="form.keyword2"
              placeholder="请选择你的目标"
              clearable
              filterable
            >
              <el-option
                v-for="goal in goalsList"
                :key="goal"
                :label="goal"
                :value="goal"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="游戏ID" prop="gameId">
            <el-input v-model="form.gameId" placeholder="你的游戏ID" />
          </el-form-item>
          <el-form-item label="额外说明" prop="extra">
            <el-input
              v-model="form.extra"
              type="textarea"
              placeholder="选填，限10个字"
              maxlength="10"
              show-word-limit
            />
          </el-form-item>
        </template>

        <!-- 交换生物类型的表单 -->
        <template v-else-if="form.type === 'exchange'">
          <el-form-item label="我的东西" prop="keyword1">
            <el-select
              v-model="form.keyword1"
              placeholder="选择你要交换的生物"
              clearable
              filterable
            >
              <el-option
                v-for="bio in bioList"
                :key="bio"
                :label="bio"
                :value="bio"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="想换的东西" prop="keyword2">
            <el-select
              v-model="form.keyword2"
              placeholder="选择你想要的生物"
              clearable
              filterable
            >
              <el-option
                v-for="bio in bioList"
                :key="bio"
                :label="bio"
                :value="bio"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="游戏ID" prop="gameId">
            <el-input v-model="form.gameId" placeholder="你的游戏ID" />
          </el-form-item>
          <el-form-item label="额外说明" prop="extra">
            <el-input
              v-model="form.extra"
              type="textarea"
              placeholder="选填，限10个字"
              maxlength="10"
              show-word-limit
            />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">发布</el-button>
        </el-form-item>
      </el-form>

      <!-- 实时预览 -->
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

// 寻人目标预设列表
const goalsList = [
  '求联系方式',
  '奇象巡展分会场摆阵（如岁家，mujica）',
  '助战扩列',
  '一起听塞壬唱片',
  '奇象对决求对手'
];

// 生物列表（用于交换）
const bioList = [
  '锐爪巨翼兽', '星术绒绒', '奥术绒绒', '青花', '赤霞', '“酩酊”',
  '大个子绒绒', '灼热跳跳蜥',
  '活泼绒绒', '爬行鬼伞', '“阿咬”', '大嘴捕食草',
  '高普尼克', '石背岩壳蟹', '不知足吞噬者', '孤独的巨像',
  '密林锋脊裂兽', '枯焦锋脊裂兽', '寒山大角驮兽', '温和驮兽',
  '固海凿石者', '困困荪茸', '浪花小壳蟹', '熔火小壳蟹',
  '未定义石兽', '花冠园丁', '黑毛花冠园丁', '果冻清道夫', '钵海收割者',
  '蓝冠羽镖客', '橙冠羽镖客', '深林伪形兽', '赤黑伪形兽',
  '直立小雪怪', '红宝石投石虫', '石榴弩手', '椰壳蟹'
];

// 表单验证规则
const rules = computed(() => {
  const baseRules = {
    type: [{ required: true, message: '请选择类型', trigger: 'change' }],
    gameId: [{ required: true, message: '请输入游戏ID', trigger: 'blur' }],
  };

  if (form.type === 'find_people') {
    return {
      ...baseRules,
      keyword1: [{ required: true, message: '请输入寻找对象', trigger: 'blur' }],
      keyword2: [{ required: true, message: '请选择目标', trigger: 'change' }],
    };
  } else if (form.type === 'exchange') {
    return {
      ...baseRules,
      keyword1: [{ required: true, message: '请选择你的东西', trigger: 'change' }],
      keyword2: [{ required: true, message: '请选择想换的东西', trigger: 'change' }],
    };
  }
  return baseRules;
});

// 实时预览
const previewContent = computed(() => {
  if (!form.type || !form.keyword1 || !form.keyword2 || !form.gameId) return '';
  let base;
  if (form.type === 'find_people') {
    base = `【寻人】我正在寻找“${form.keyword1}”，目标是“${form.keyword2}”，游戏ID：${form.gameId}。`;
  } else if (form.type === 'exchange') {
    base = `【交换】我有“${form.keyword1}”，想换“${form.keyword2}”，游戏ID：${form.gameId}。`;
  }
  return base + (form.extra ? `补充：${form.extra}` : '');
});

// 提交
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
      // 重置
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