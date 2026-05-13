<template>
  <div class="diary-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="icon">📔</span>
        <h2>AI 日记本</h2>
      </div>
      <div class="header-actions">
        <button
          @click="triggerFileInput"
          class="btn-secondary"
          title="导入日记文件"
        >
          📁 导入
        </button>
        <button
          v-if="!diaryState.isDiaryMode"
          @click="handleStartDiary"
          :disabled="!appState.avatar.connected"
          class="btn-primary"
        >
          <span class="icon">✏️</span>
          写日记
        </button>
      </div>
    </div>

    <div v-if="!appState.avatar.connected" class="panel-waiting">
      <div class="waiting-icon">🤖</div>
      <p>请先在设置中配置并连接服务</p>
      <button @click="$emit('openSettings')" class="btn-settings-link">
        ⚙️ 前往设置
      </button>
    </div>

    <div v-else-if="diaryState.isDiaryMode" class="diary-workspace">
      <div class="workspace-header">
        <span class="date-badge">{{ currentDate }}</span>
        <button @click="handleCloseDiary" class="btn-close-workspace">×</button>
      </div>

      <div class="conversation-area" ref="conversationRef">
        <div
          v-for="(msg, index) in diaryState.conversationMessages"
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="message-content">{{ msg.content }}</div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>

        <div v-if="diaryState.isAiSpeaking" class="message assistant">
          <div class="message-content thinking">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="input-area">
        <input
          v-model="inputText"
          @keyup.enter="handleTextSubmit"
          placeholder="写下你的心声..."
          :disabled="diaryState.isAiSpeaking"
        />
        <button
          @click="handleVoiceInput"
          :disabled="diaryState.isAiSpeaking"
          :class="['btn-mic', { recording: diaryState.isListening }]"
        >
          🎤
        </button>
        <button
          @click="handleTextSubmit"
          :disabled="!inputText.trim() || diaryState.isAiSpeaking"
          class="btn-send"
        >
          ✉️
        </button>
      </div>

      <div class="workspace-actions">
        <button @click="handleSaveDiary" class="btn-action" :disabled="diaryState.conversationMessages.length === 0">
          💾 保存
        </button>
        <button @click="handleSaveToFile" class="btn-action" :disabled="diaryState.conversationMessages.length === 0">
          💾 导出文件
        </button>
        <button @click="handleNewPage" class="btn-action">
          📄 新页
        </button>
      </div>
    </div>

    <div v-else class="diary-list-section">
      <div class="section-header">
        <h3>📚 历史日记</h3>
      </div>

      <div class="diary-list">
        <div
          v-for="entry in diaryHistory"
          :key="entry.date"
          class="diary-card"
          @click="handleViewDiary(entry)"
        >
          <div class="card-date">{{ entry.date }}</div>
          <div class="card-summary">{{ entry.summary || entry.content.substring(0, 80) + '...' }}</div>
          <div class="card-meta">
            <span v-if="entry.weather" class="meta-tag">🌤️ {{ entry.weather }}</span>
            <span v-if="entry.mood" class="meta-tag">💝 {{ entry.mood }}</span>
          </div>
        </div>

        <div v-if="diaryHistory.length === 0" class="empty-list">
          <div class="empty-icon">📖</div>
          <p>还没有日记哦<br/>点击上方"写日记"开始记录吧~</p>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleFileSelect"
      style="display: none"
    />

    <Transition name="fade">
      <div v-if="showDiaryDetail" class="detail-overlay" @click.self="showDiaryDetail = false">
        <div class="detail-modal">
          <div class="modal-header">
            <h3>{{ selectedDiary?.date }}</h3>
            <button @click="showDiaryDetail = false" class="btn-close">×</button>
          </div>
          <div class="modal-content">
            <div v-if="selectedDiary?.weather" class="detail-tags">🌤️ {{ selectedDiary.weather }}</div>
            <div v-if="selectedDiary?.mood" class="detail-tags">💝 {{ selectedDiary.mood }}</div>
            <div class="detail-text">{{ selectedDiary?.content }}</div>
          </div>
          <div class="modal-footer">
            <button @click="handleSaveEntryToFile(selectedDiary)" class="btn-export">💾 导出</button>
            <button @click="handleDeleteDiary(selectedDiary?.date)" class="btn-delete">🗑️ 删除</button>
            <button @click="showDiaryDetail = false" class="btn-cancel">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, inject } from 'vue'
import { useAsr } from '../composables/useAsr'
import { diaryState, diaryStore } from '../stores/diary'
import { generateSSML, delay } from '../utils'
import { diaryService, type DiaryEntry } from '../services/diary'
import type { AppState } from '../types'

defineEmits<{
  openSettings: []
}>()

const appState = inject<AppState>('appState')!

const inputText = ref('')
const conversationRef = ref<HTMLElement>()
const showDiaryDetail = ref(false)
const selectedDiary = ref<DiaryEntry | null>(null)
const diaryHistory = ref<DiaryEntry[]>([])
const avatarState = ref('')
const fileInput = ref<HTMLInputElement>()

const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

onMounted(() => {
  loadDiaryHistory()
})

function loadDiaryHistory() {
  diaryHistory.value = diaryService.getAllEntries()
}

watch(() => diaryState.conversationMessages.length, () => {
  nextTick(() => {
    if (conversationRef.value) {
      conversationRef.value.scrollTop = conversationRef.value.scrollHeight
    }
  })
})

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleStartDiary() {
  await diaryStore.startDiaryMode()
}

async function handleCloseDiary() {
  if (diaryState.conversationMessages.length > 0) {
    const confirm = window.confirm('还有未保存的内容，确定要关闭吗？')
    if (!confirm) return
  }
  await diaryStore.stopDiaryMode()
  loadDiaryHistory()
}

async function handleTextSubmit() {
  if (!inputText.value.trim() || diaryState.isAiSpeaking) return

  const text = inputText.value.trim()
  inputText.value = ''

  await diaryStore.handleUserInput(text)
  await speakLatestMessage()
}

async function handleVoiceInput() {
  if (diaryState.isListening) {
    diaryState.isListening = false
    return
  }

  if (!appState.asr.appId || !appState.asr.secretId || !appState.asr.secretKey) {
    alert('请先在设置中配置ASR信息')
    return
  }

  diaryState.isListening = true

  const { start: startNewAsr, stop: stopNewAsr } = useAsr({
    provider: 'tx',
    appId: appState.asr.appId as string,
    secretId: appState.asr.secretId,
    secretKey: appState.asr.secretKey
  })

  startNewAsr({
    onFinished: async (text: string) => {
      stopNewAsr()
      diaryState.isListening = false
      await diaryStore.handleUserInput(text)
      await speakLatestMessage()
    },
    onError: () => {
      stopNewAsr()
      diaryState.isListening = false
    }
  })
}

async function speakLatestMessage() {
  const messages = diaryState.conversationMessages
  if (messages.length === 0) return

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'assistant') return

  const avatar = appState.avatar.instance
  if (!avatar) return

  try {
    if (avatarState.value === 'speak') {
      avatar.think()
      await delay(2000)
    }

    const sentences = splitSentence(lastMessage.content)
    let isFirst = true

    for (const sentence of sentences) {
      if (!sentence.trim()) continue

      const ssml = generateSSML(sentence)
      if (isFirst) {
        avatar.speak(ssml, true, false)
        isFirst = false
      } else {
        avatar.speak(ssml, false, false)
      }

      await delay(sentence.length * 200 + 500)
    }

    avatar.speak(generateSSML(''), false, true)
  } catch (error) {
    console.error('播放语音失败:', error)
  }
}

function splitSentence(text: string): string[] {
  if (!text) return []

  const punctuations = ['、', '，', '：', '；', '。', '？', '！', '…', '\n']
  let result: string[] = []
  let current = ''

  for (const char of text) {
    current += char
    if (punctuations.includes(char)) {
      result.push(current)
      current = ''
    }
  }

  if (current) result.push(current)
  return result.length > 0 ? result : [text]
}

async function handleSaveDiary() {
  await diaryStore.saveDiaryFromConversation()
  alert('日记已保存~ 📖')
  loadDiaryHistory()
}

async function handleSaveToFile() {
  const entry = await diaryStore.getTodayDiary()
  if (entry) {
    await diaryService.saveDiaryToFile(entry)
    alert('日记已导出为JSON文件~ 📄')
  } else {
    alert('请先保存日记再导出')
  }
}

async function handleSaveEntryToFile(entry: DiaryEntry | null) {
  if (entry) {
    await diaryService.saveDiaryToFile(entry)
    alert('日记已导出为JSON文件~ 📄')
  }
}

function handleNewPage() {
  diaryStore.clearConversation()
  inputText.value = ''
}

function handleViewDiary(entry: DiaryEntry) {
  selectedDiary.value = entry
  showDiaryDetail.value = true
}

async function handleDeleteDiary(date?: string) {
  if (!date) return
  if (confirm('确定要删除这篇日记吗？')) {
    await diaryStore.deleteDiary(date)
    showDiaryDetail.value = false
    loadDiaryHistory()
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const entry = await diaryService.loadDiaryFromFile(file)
    if (entry) {
      await diaryService.saveDiary(entry)
      loadDiaryHistory()
      alert('日记文件导入成功~ 📁')
    } else {
      alert('导入失败，请确保文件格式正确')
    }
  }
  target.value = ''
}
</script>

<style scoped>
.diary-panel {
  width: 380px;
  height: 100vh;
  background: linear-gradient(180deg, #fef9f3 0%, #f5efe5 100%);
  border-left: 1px solid #e8dcc8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 20px;
  background: white;
  border-bottom: 1px dashed #d4c4a8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title .icon {
  font-size: 28px;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  color: #5a4a3a;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  background: #8b7355;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #6b5a4a;
}

.panel-waiting {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  text-align: center;
}

.waiting-icon {
  font-size: 60px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.panel-waiting p {
  color: #8a7a6a;
  margin: 0 0 20px 0;
  font-size: 14px;
}

.btn-settings-link {
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: #8b7355;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-settings-link:hover {
  background: #6b5a4a;
}

.diary-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.date-badge {
  font-size: 14px;
  font-weight: 600;
}

.btn-close-workspace {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
}

.btn-close-workspace:hover {
  opacity: 1;
}

.conversation-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  align-self: flex-end;
  align-items: flex-end;
}

.message.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: white;
  color: #4a4a4a;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}

.thinking {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
}

.thinking span {
  width: 8px;
  height: 8px;
  background: #d0d0d0;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.thinking span:nth-child(1) { animation-delay: 0s; }
.thinking span:nth-child(2) { animation-delay: 0.2s; }
.thinking span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-top: 1px dashed #d4c4a8;
}

.input-area input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e8dcc8;
  border-radius: 22px;
  font-size: 14px;
  background: #faf8f5;
  transition: all 0.2s;
}

.input-area input:focus {
  outline: none;
  border-color: #8b7355;
  background: white;
}

.btn-mic {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b7355 0%, #6b5a4a 100%);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mic:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-mic.recording {
  background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.btn-send {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workspace-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(200, 185, 160, 0.2);
}

.btn-action {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #5a4a3a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.diary-list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e8dcc8;
}

.section-header h3 {
  margin: 0;
  font-size: 15px;
  color: #5a4a3a;
  font-weight: 600;
}

.diary-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.diary-card {
  padding: 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #8b7355;
}

.diary-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-date {
  font-size: 13px;
  font-weight: 700;
  color: #8b7355;
  margin-bottom: 8px;
}

.card-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.card-meta {
  display: flex;
  gap: 8px;
}

.meta-tag {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 10px;
}

.empty-list {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-list p {
  color: #8a7a6a;
  font-size: 14px;
  line-height: 1.8;
}

.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-modal {
  width: 360px;
  max-height: 80vh;
  background: #fef9f3;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-content {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.detail-tags {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 20px;
  font-size: 13px;
  margin-right: 8px;
  margin-bottom: 16px;
}

.detail-text {
  font-size: 14px;
  line-height: 2;
  color: #4a4a4a;
  white-space: pre-wrap;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: #f5f0e5;
}

.btn-export {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #27ae60;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #219a52;
}

.btn-delete {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #e74c3c;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #c0392b;
}

.btn-cancel {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #ddd;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #ccc;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
