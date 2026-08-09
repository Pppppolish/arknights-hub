import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 后端地址
  timeout: 5000
});

// 请求拦截器：自动添加 Authorization 头
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;