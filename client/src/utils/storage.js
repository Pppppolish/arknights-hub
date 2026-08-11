const KEY = 'arknights_remember_me';

let engine = (() => {
  // 初始化阶段无法读取 checkbox，先根据 localStorage 中保存的偏好决定
  try {
    return localStorage.getItem(KEY) === 'true' ? localStorage : sessionStorage;
  } catch (e) {
    return sessionStorage;
  }
})();

export function setRememberMe(remember) {
  engine = remember ? localStorage : sessionStorage;
  try {
    localStorage.setItem(KEY, remember ? 'true' : 'false');
  } catch (e) {
    // 忽略
  }
}

export function getItem(key) {
  return engine.getItem(key);
}

export function setItem(key, value) {
  engine.setItem(key, value);
}

export function removeItem(key) {
  engine.removeItem(key);
}

export function clear() {
  engine.clear();
}