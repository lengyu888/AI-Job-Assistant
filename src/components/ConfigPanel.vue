<template>
  <div class="config-panel">
    <div v-if="!appState.avatar.connected" class="welcome-card">
      <div class="welcome-icon">📔</div>
      <h2>AI 日记本</h2>
      <p>点击右上角 ⚙️ 设置按钮<br/>配置您的数字人服务</p>
    </div>

    <div v-else class="chat-panel">
      <div class="chat-header">
        <h3>💬 与数字人对话</h3>
      </div>

      <div class="form-group">
        <textarea
          v-model="appState.ui.text"
          rows="5"
          placeholder="输入您想说的话..."
        />
      </div>

      <div class="chat-actions">
        <button
          @click="handleVoiceInput"
          class="btn btn-voice"
          :class="{ listening: appState.asr.isListening }"
        >
          <span class="icon">🎤</span>
          {{ appState.asr.isListening ? '停止' : '语音输入' }}
        </button>

        <button
          @click="handleSendMessage"
          :disabled="!appState.ui.text.trim() || isSending"
          class="btn btn-send"
        >
          <span class="icon">📨</span>
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useAsr } from '../composables/useAsr'
import type { AppState, AppStore } from '../types'

const appState = inject<AppState>('appState')!
const appStore = inject<AppStore>('appStore')!
const isSending = ref(false)
let stopAsrFn: (() => void) | null = null

async function handleSendMessage() {
  if (isSending.value || !appState.ui.text.trim()) return

  isSending.value = true
  try {
    await appStore.sendMessage()
  } catch (error) {
    console.error('发送消息失败:', error)
  } finally {
    isSending.value = false
  }
}

function handleVoiceInput() {
  if (appState.asr.isListening) {
    stopAsr()
    appStore.stopVoiceInput()
    return
  }

  const { start: startNewAsr, stop: stopNewAsr } = useAsr({
    provider: 'tx',
    appId: appState.asr.appId as string,
    secretId: appState.asr.secretId,
    secretKey: appState.asr.secretKey
  })

  stopAsrFn = () => {
    stopNewAsr()
    appStore.stopVoiceInput()
    stopAsrFn = null
  }

  startNewAsr({
    onFinished: (text: string) => {
      appState.ui.text = text
      appStore.stopVoiceInput()
    },
    onError: () => {
      appStore.stopVoiceInput()
    }
  })
}

function stopAsr() {
  if (stopAsrFn) {
    stopAsrFn()
  }
}
</script>

<style scoped>
.config-panel {
  width: 380px;
  height: 100vh;
  background: white;
  border-left: 1px solid #e8e0d5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  text-align: center;
  background: linear-gradient(180deg, #fef9f3 0%, #ffffff 100%);
}

.welcome-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.welcome-card h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  color: #5a4a3a;
  font-weight: 600;
}

.welcome-card p {
  margin: 0;
  color: #8a7a6a;
  font-size: 15px;
  line-height: 1.8;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.chat-header {
  margin-bottom: 20px;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
  color: #5a4a3a;
  font-weight: 600;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.form-group textarea {
  flex: 1;
  width: 100%;
  padding: 14px;
  border: 2px solid #e8e0d5;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  transition: all 0.2s;
  background: #faf8f5;
}

.form-group textarea:focus {
  outline: none;
  border-color: #8b7355;
  background: white;
}

.chat-actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  font-size: 18px;
}

.btn-voice {
  background: linear-gradient(135deg, #8b7355 0%, #6b5a4a 100%);
  color: white;
}

.btn-voice:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 115, 85, 0.3);
}

.btn-voice.listening {
  background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.btn-send {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}
</style>