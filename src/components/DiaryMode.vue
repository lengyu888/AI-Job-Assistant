<template>
  <Transition name="slide-up">
    <div v-if="diaryState.isDiaryMode" class="diary-book">
      <div class="book-spine"></div>

      <div class="book-content">
        <div class="book-header">
          <div class="header-decoration">
            <span class="date-display">{{ currentDate }}</span>
            <button @click="handleClose" class="btn-close-book">×</button>
          </div>
          <h2 class="book-title">📖 我的日记</h2>
          <div class="header-ornament">✿ ❀ ✿</div>
        </div>

        <div class="conversation-scroll" ref="conversationRef">
          <div class="conversation-area">
            <div
              v-for="(msg, index) in diaryState.conversationMessages"
              :key="index"
              :class="['message', msg.role]"
            >
              <div class="message-bubble">
                <div class="message-text">{{ msg.content }}</div>
                <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>

            <div v-if="diaryState.isAiSpeaking" class="message assistant">
              <div class="message-bubble thinking">
                <div class="thinking-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-section">
          <div class="input-wrapper">
            <button
              @click="handleVoiceInput"
              :disabled="!appState.avatar.connected || diaryState.isAiSpeaking"
              :class="['btn-mic', { recording: diaryState.isListening }]"
            >
              🎤
            </button>
            <input
              v-model="inputText"
              @keyup.enter="handleTextSubmit"
              placeholder="写下你的心声..."
              :disabled="diaryState.isAiSpeaking"
            />
            <button
              @click="handleTextSubmit"
              :disabled="!inputText.trim() || diaryState.isAiSpeaking"
              class="btn-send"
            >
              ✉️
            </button>
          </div>
        </div>

        <div class="book-footer">
          <button @click="handleSaveDiary" class="btn-action" :disabled="diaryState.conversationMessages.length === 0">
            <span class="icon">💾</span> 保存
          </button>
          <button @click="handleViewHistory" class="btn-action">
            <span class="icon">📚</span> 历史
          </button>
          <button @click="handleNewPage" class="btn-action">
            <span class="icon">📄</span> 新页
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="showHistory" class="history-overlay" @click.self="showHistory = false">
          <div class="history-drawer">
            <div class="drawer-header">
              <h3>📚 日记本</h3>
              <button @click="showHistory = false" class="btn-close">×</button>
            </div>
            <div class="drawer-content">
              <div
                v-for="entry in diaryHistory"
                :key="entry.date"
                class="history-card"
              >
                <div class="card-date">{{ entry.date }}</div>
                <div class="card-preview">{{ entry.summary || entry.content.substring(0, 60) + '...' }}</div>
                <div class="card-actions">
                  <button @click="handleViewDiary(entry)" class="btn-small">阅读</button>
                  <button @click="handleDeleteDiary(entry.date)" class="btn-small btn-delete">删除</button>
                </div>
              </div>
              <div v-if="diaryHistory.length === 0" class="empty-state">
                <div class="empty-icon">📖</div>
                <p>还没有日记哦<br/>开始记录今天的故事吧~</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="showDiaryDetail" class="diary-detail-overlay" @click.self="showDiaryDetail = false">
          <div class="diary-detail-book">
            <div class="detail-header">
              <h3>{{ selectedDiary?.date }}</h3>
              <button @click="showDiaryDetail = false" class="btn-close">×</button>
            </div>
            <div class="detail-content">
              <div v-if="selectedDiary?.weather" class="detail-tag">🌤️ {{ selectedDiary.weather }}</div>
              <div v-if="selectedDiary?.mood" class="detail-tag">💝 {{ selectedDiary.mood }}</div>
              <div class="diary-text">{{ selectedDiary?.content }}</div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, inject, computed } from 'vue'
import { useAsr } from '../composables/useAsr'
import { diaryState, diaryStore } from '../stores/diary'
import { generateSSML, delay } from '../utils'
import type { AppState } from '../types'
import type { DiaryEntry } from '../services/diary'

const appState = inject<AppState>('appState')!

const inputText = ref('')
const conversationRef = ref<HTMLElement>()
const showHistory = ref(false)
const showDiaryDetail = ref(false)
const selectedDiary = ref<DiaryEntry | null>(null)
const diaryHistory = ref<DiaryEntry[]>([])

const currentDate = computed(() => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  return now.toLocaleDateString('zh-CN', options)
})

const avatarState = ref('')

watch(() => diaryState.conversationMessages.length, () => {
  nextTick(() => {
    if (conversationRef.value) {
      conversationRef.value.scrollTop = conversationRef.value.scrollHeight
    }
  })
})

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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

  const chinesePunctuations = ['、', '，', '：', '；', '。', '？', '！', '…', '\n']
  let result: string[] = []
  let current = ''

  for (const char of text) {
    current += char
    if (chinesePunctuations.includes(char)) {
      result.push(current)
      current = ''
    }
  }

  if (current) {
    result.push(current)
  }

  return result.length > 0 ? result : [text]
}

async function handleSaveDiary() {
  await diaryStore.saveDiaryFromConversation()
  alert('日记已保存到本子上了~ 📖')
}

function handleViewHistory() {
  diaryHistory.value = diaryStore.getDiaryHistory()
  showHistory.value = true
}

function handleViewDiary(entry: DiaryEntry) {
  selectedDiary.value = entry
  showDiaryDetail.value = true
}

async function handleDeleteDiary(date: string) {
  if (confirm('确定要删除这一天的日记吗？')) {
    await diaryStore.deleteDiary(date)
    diaryHistory.value = diaryStore.getDiaryHistory()
  }
}

function handleNewPage() {
  diaryStore.clearConversation()
  inputText.value = ''
}

async function handleClose() {
  if (diaryState.conversationMessages.length > 0) {
    const confirm = window.confirm('还有未保存的内容，确定要合上日记本吗？')
    if (!confirm) return
  }

  await diaryStore.stopDiaryMode()
}
</script>

<style scoped>
.diary-book {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 420px;
  max-height: 85vh;
  background: linear-gradient(135deg, #fef9f3 0%, #f5efe5 100%);
  border-radius: 16px 8px 8px 16px;
  box-shadow:
    -4px 0 0 #d4c4a8,
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
  z-index: 1000;
  animation: openBook 0.4s ease-out;
}

@keyframes openBook {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.book-spine {
  width: 20px;
  background: linear-gradient(90deg, #c9b896 0%, #e8dcc8 50%, #c9b896 100%);
  border-right: 1px solid #b8a888;
}

.book-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.book-header {
  padding: 20px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255,245,235,0.9) 0%, transparent 100%);
  border-bottom: 1px dashed #d4c4a8;
}

.header-decoration {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.date-display {
  font-size: 12px;
  color: #8a7a6a;
  font-weight: 500;
}

.btn-close-book {
  background: none;
  border: none;
  font-size: 24px;
  color: #a09080;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-close-book:hover {
  color: #5a4a3a;
}

.book-title {
  margin: 0;
  font-size: 24px;
  color: #5a4a3a;
  font-weight: 700;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.8);
}

.header-ornament {
  margin-top: 8px;
  font-size: 12px;
  color: #c9a86c;
  letter-spacing: 8px;
}

.conversation-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 280px;
  max-height: 350px;
  padding: 16px;
  background:
    repeating-linear-gradient(
      transparent,
      transparent 27px,
      #e8dcc8 28px
    );
  background-position: 0 8px;
}

.conversation-area {
  padding-top: 8px;
}

.message {
  margin-bottom: 16px;
  display: flex;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-bubble {
  background: white;
  color: #4a4a4a;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  margin-top: 6px;
  opacity: 0.7;
  text-align: right;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message.assistant .message-time {
  color: #999;
}

.thinking-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: #d0d0d0;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.thinking-dots span:nth-child(1) { animation-delay: 0s; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.input-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px dashed #d4c4a8;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: center;
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
  flex-shrink: 0;
}

.btn-mic:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-mic.recording {
  background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(192, 57, 43, 0); }
}

.input-wrapper input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e8dcc8;
  border-radius: 22px;
  font-size: 14px;
  background: #faf8f5;
  transition: all 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #8b7355;
  background: white;
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
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.book-footer {
  display: flex;
  padding: 12px 16px;
  background: rgba(200, 185, 160, 0.3);
  gap: 8px;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #5a4a3a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-action:hover:not(:disabled) {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action .icon {
  font-size: 14px;
}

.history-overlay,
.diary-detail-overlay {
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

.history-drawer {
  width: 380px;
  max-height: 80vh;
  background: #fef9f3;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #8b7355 0%, #6b5a4a 100%);
  color: white;
}

.drawer-header h3 {
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

.drawer-content {
  padding: 16px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.history-card {
  padding: 14px;
  background: white;
  border-radius: 10px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #8b7355;
}

.card-date {
  font-size: 13px;
  font-weight: 700;
  color: #8b7355;
  margin-bottom: 6px;
}

.card-preview {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #667eea;
  color: white;
}

.btn-small:hover {
  background: #5a6fd6;
}

.btn-delete {
  background: #e74c3c;
}

.btn-delete:hover {
  background: #c0392b;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #8a7a6a;
  font-size: 14px;
  line-height: 1.8;
}

.diary-detail-book {
  width: 380px;
  max-height: 80vh;
  background: #fef9f3;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
}

.detail-content {
  padding: 20px;
}

.detail-tag {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 20px;
  font-size: 13px;
  margin-right: 8px;
  margin-bottom: 16px;
}

.diary-text {
  font-size: 14px;
  line-height: 2;
  color: #4a4a4a;
  white-space: pre-wrap;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(60px) scale(0.9);
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
