<template>
  <Transition name="slide">
    <div v-if="isOpen" class="settings-overlay" @click.self="close">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>⚙️ 设置</h3>
          <button @click="close" class="btn-close">×</button>
        </div>

        <div class="settings-content">
          <section class="config-section">
            <h4>🤖 虚拟人 SDK</h4>
            <div class="form-group">
              <label>应用 APP ID</label>
              <input
                v-model="appState.avatar.appId"
                type="text"
                placeholder="请输入 APP ID"
              />
            </div>
            <div class="form-group">
              <label>应用 APP Secret</label>
              <input
                v-model="appState.avatar.appSecret"
                type="password"
                placeholder="请输入 APP Secret"
              />
            </div>
          </section>

          <section class="config-section">
            <h4>🎤 语音识别 (ASR)</h4>
            <div class="form-group">
              <label>ASR App ID</label>
              <input
                v-model="appState.asr.appId"
                type="text"
                placeholder="请输入 ASR App ID"
              />
            </div>
            <div class="form-group">
              <label>Secret ID</label>
              <input
                v-model="appState.asr.secretId"
                type="text"
                placeholder="请输入 Secret ID"
              />
            </div>
            <div class="form-group">
              <label>Secret Key</label>
              <input
                v-model="appState.asr.secretKey"
                type="password"
                placeholder="请输入 Secret Key"
              />
            </div>
          </section>

          <section class="config-section">
            <h4>🧠 大语言模型 (LLM)</h4>
            <div class="form-group">
              <label>模型选择</label>
              <select v-model="appState.llm.model">
                <option
                  v-for="model in supportedModels"
                  :key="model"
                  :value="model"
                >
                  {{ model }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input
                v-model="appState.llm.apiKey"
                type="password"
                placeholder="请输入 API Key"
              />
            </div>
          </section>

          <div class="settings-footer">
            <button
              @click="handleConnect"
              :disabled="isConnecting || appState.avatar.connected"
              class="btn btn-primary"
            >
              {{ isConnecting ? '连接中...' : appState.avatar.connected ? '已连接' : '连接服务' }}
            </button>
            <button
              v-if="appState.avatar.connected"
              @click="handleDisconnect"
              class="btn btn-secondary"
            >
              断开
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, inject, defineEmits, defineProps } from 'vue'
import { SUPPORTED_LLM_MODELS } from '../constants'
import type { AppState, AppStore } from '../types'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const appState = inject<AppState>('appState')!
const appStore = inject<AppStore>('appStore')!
const isConnecting = ref(false)
const supportedModels = SUPPORTED_LLM_MODELS

function close() {
  emit('close')
}

async function handleConnect() {
  if (isConnecting.value) return

  isConnecting.value = true
  try {
    await appStore.connectAvatar()
  } catch (error) {
    console.error('连接失败:', error)
    alert('连接失败，请检查配置信息')
  } finally {
    isConnecting.value = false
  }
}

function handleDisconnect() {
  appStore.disconnectAvatar()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.settings-panel {
  width: 420px;
  max-height: 85vh;
  background: #fefefe;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.btn-close:hover {
  opacity: 1;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.config-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #333;
  font-weight: 600;
}

.form-group {
  margin-bottom: 14px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.settings-footer {
  padding: 20px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .settings-panel,
.slide-leave-to .settings-panel {
  transform: scale(0.9) translateY(20px);
}
</style>
