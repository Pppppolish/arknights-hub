<template>
  <el-menu 
    :default-active="activePath" 
    mode="horizontal" 
    router 
    background-color="#545c64"
    text-color="#fff"
    active-text-color="#ffd04b"
    class="nav-bar"
  >
    <el-menu-item index="/lobby">大厅</el-menu-item>
    <el-menu-item index="/create-room">创建房间</el-menu-item>
    <el-menu-item index="/profile">个人中心</el-menu-item>
    <el-menu-item index="/new-post">发布帖子</el-menu-item>
  </el-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const activePath = computed(() => route.path);
</script>

<style scoped>
.nav-bar {
  margin-bottom: 20px;
}
</style>