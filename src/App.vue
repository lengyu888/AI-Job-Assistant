<template>
  <div class="app-container">
    <div class="main">
      <div class="avatar-section">
        <SdkRender class="avatar-render"/>
      </div>

      <div class="panel-section">
        <div class="module-nav">
          <button
            v-for="mod in modules"
            :key="mod.value"
            :class="['nav-btn', { active: jobState.activeModule === mod.value }]"
            @click="switchModule(mod.value)"
          >
            <span class="nav-icon">{{ mod.icon }}</span>
            <span class="nav-label">{{ mod.label }}</span>
          </button>
        </div>

        <div class="avatar-control-bar" v-if="appState.avatar.connected">
          <button
            @click="handleAvatarSpeak"
            :disabled="isSpeaking"
            class="btn-avatar-speak"
            title="让AI助手说话"
          >
            <span class="btn-icon">🔊</span>
            <span>{{ isSpeaking ? '播报中...' : '打招呼' }}</span>
          </button>
        </div>

        <div class="panel-container">
          <ResumePanel
            v-if="jobState.activeModule === 'resume'"
            @openSettings="showSettings = true"
            @switchModule="switchModule"
            @analyzeComplete="handleResumeAnalyzeComplete"
          />
          <InterviewPanel
            v-else-if="jobState.activeModule === 'interview'"
            @switchModule="switchModule"
            @questionGenerated="handleQuestionGenerated"
            @answerSubmitted="handleAnswerSubmitted"
          />
          <JobMatchPanel
            v-else-if="jobState.activeModule === 'jobMatch'"
            @switchModule="switchModule"
          />
          <MaterialsPanel
            v-else-if="jobState.activeModule === 'materials'"
          />
        </div>
      </div>

      <button
        @click="showSettings = true"
        class="btn-settings"
        title="设置"
      >
        ⚙️
      </button>

      <Transition name="fade">
        <SettingsPanel
          v-if="showSettings"
          :isOpen="showSettings"
          @close="showSettings = false"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import SdkRender from './components/AvatarRender.vue'
import ResumePanel from './components/ResumePanel.vue'
import InterviewPanel from './components/InterviewPanel.vue'
import JobMatchPanel from './components/JobMatchPanel.vue'
import MaterialsPanel from './components/MaterialsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { appState, appStore } from './stores/app'
import { jobState, jobStore, type ActiveModule } from './stores/job'
import { generateSSML, delay } from './utils'

provide('appState', appState)
provide('appStore', appStore)
provide('jobState', jobState)
provide('jobStore', jobStore)

const showSettings = ref(false)
const isSpeaking = ref(false)

const modules = [
  { value: 'resume' as ActiveModule, label: '简历优化', icon: '📄' },
  { value: 'interview' as ActiveModule, label: '模拟面试', icon: '🎯' },
  { value: 'jobMatch' as ActiveModule, label: '岗位匹配', icon: '🎯' },
  { value: 'materials' as ActiveModule, label: '素材库', icon: '📚' }
]

function switchModule(module: string) {
  jobStore.setActiveModule(module as ActiveModule)
}

async function speakText(text: string) {
  if (!appState.avatar.connected || isSpeaking.value) return

  const avatar = appState.avatar.instance
  if (!avatar) return

  isSpeaking.value = true

  try {
    const sentences = splitSentence(text)
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

      await delay(sentence.length * 180 + 400)
    }

    avatar.speak(generateSSML(''), false, true)
  } catch (error) {
    console.error('播放语音失败:', error)
  } finally {
    isSpeaking.value = false
  }
}

async function handleAvatarSpeak() {
  const greeting = '您好！我是您的AI求职管家。我可以帮您优化简历、模拟面试、匹配岗位。请问有什么可以帮到您的吗？'
  await speakText(greeting)
}

function handleResumeAnalyzeComplete() {
  if (!jobState.resume.analysisResult) return
  
  const result = jobState.resume.analysisResult
  let report = `您的简历分析完成！综合得分${result.score.total}分。关键词匹配得分${result.score.keywordMatch}分，经历量化得分${result.score.quantification}分，排版结构得分${result.score.structure}分，成就亮点得分${result.score.highlight}分，整体完整得分${result.score.completeness}分。`
  
  if (result.issues.length > 0) {
    report += `发现${result.issues.length}个问题需要优化。`
    result.issues.slice(0, 3).forEach((issue, index) => {
      report += `第${index + 1}个问题：${issue.description}。建议：${issue.suggestion}。`
    })
    if (result.issues.length > 3) {
      report += `还有${result.issues.length - 3}个建议请查看详情。`
    }
  } else {
    report += '简历整体表现不错！'
  }
  
  if (result.layoutSuggestion) {
    report += `排版建议：${result.layoutSuggestion}`
  }
  
  speakText(report)
}

function handleQuestionGenerated(question: string) {
  speakText(question)
}

function handleAnswerSubmitted(feedback: string) {
  speakText(feedback)
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
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f7f5 0%, #ebe8e3 100%);
}

.main {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

.avatar-section {
  flex: 1;
  position: relative;
}

.avatar-render {
  width: 100%;
  height: 100%;
}

.panel-section {
  width: 420px;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8dcc8;
}

.module-nav {
  display: flex;
  background: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
}

.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.nav-btn:hover {
  background: #f0f0f0;
}

.nav-btn.active {
  background: white;
  border-bottom-color: #667eea;
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 12px;
  color: #666;
}

.nav-btn.active .nav-label {
  color: #667eea;
  font-weight: 600;
}

.avatar-control-bar {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-avatar-speak {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-avatar-speak:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn-avatar-speak:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

.panel-container {
  flex: 1;
  overflow: hidden;
}

.btn-settings {
  position: fixed;
  top: 20px;
  right: 440px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 22px;
  z-index: 100;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-settings:hover {
  transform: rotate(30deg) scale(1.05);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
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