<template>
  <div class="interview-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="icon">🎯</span>
        <h2>AI模拟面试</h2>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="!jobState.interview.questions.length && !jobState.interview.isCompleted" class="setup-section">
        <h3>选择面试岗位</h3>
        <div class="position-grid">
          <button
            v-for="pos in positionList"
            :key="pos.value"
            :class="['position-btn', { active: jobState.interview.position === pos.value }]"
            @click="selectPosition(pos.value)"
          >
            <span class="pos-icon">{{ pos.icon }}</span>
            <span class="pos-label">{{ pos.label }}</span>
          </button>
        </div>

        <button
          @click="startInterview"
          :disabled="jobState.interview.isGenerating"
          class="btn-start"
        >
          {{ jobState.interview.isGenerating ? '生成中...' : '🚀 开始面试' }}
        </button>
      </div>

      <div v-else-if="jobState.interview.questions.length && !jobState.interview.isCompleted" class="interview-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: ((jobState.interview.currentQuestionIndex + 1) / jobState.interview.questions.length * 100) + '%' }"
          ></div>
        </div>
        <div class="progress-text">
          问题 {{ jobState.interview.currentQuestionIndex + 1 }} / {{ jobState.interview.questions.length }}
        </div>

        <div class="question-card">
          <div class="question-header">
            <span class="question-type">{{ getQuestionTypeLabel(currentQuestion?.type) }}</span>
            <span :class="['difficulty', currentQuestion?.difficulty]">
              {{ getDifficultyLabel(currentQuestion?.difficulty) }}
            </span>
          </div>
          <p class="question-text">{{ currentQuestion?.question }}</p>
          <p class="question-hint">💡 {{ currentQuestion?.scoringCriteria }}</p>
        </div>

        <div class="answer-section">
          <textarea
            v-model="answerText"
            :disabled="jobState.interview.isEvaluating"
            :placeholder="'请输入你的回答...'"
            rows="6"
          ></textarea>
          
          <div class="answer-actions">
            <button
              @click="handleVoiceInput"
              :disabled="jobState.interview.isEvaluating"
              class="btn-voice"
              :class="{ listening: appState.asr.isListening }"
            >
              <span class="icon">🎤</span>
              {{ appState.asr.isListening ? '停止' : '语音输入' }}
            </button>
            
            <button
              @click="submitAnswer"
              :disabled="!answerText.trim() || jobState.interview.isEvaluating"
              class="btn-submit"
            >
              {{ jobState.interview.isEvaluating ? '评估中...' : '提交回答' }}
            </button>
          </div>
        </div>

        <div v-if="currentAnswer" class="feedback-card">
          <div class="feedback-header">
            <span class="feedback-score" :class="getScoreClass(currentAnswer.score)">
              {{ currentAnswer.score }}分
            </span>
          </div>
          <div class="feedback-body">
            <p><strong>✅ 优点：</strong>{{ currentAnswer.feedback }}</p>
            <p><strong>💡 改进：</strong>{{ currentAnswer.improvement }}</p>
          </div>
          <div class="feedback-actions">
            <button v-if="hasNextQuestion" @click="nextQuestion" class="btn-next">
              下一题 →
            </button>
            <button v-else @click="finishInterview" class="btn-finish">
              完成面试
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="jobState.interview.isCompleted && jobState.interview.currentReport" class="report-section">
        <div class="report-header">
          <div class="report-score">
            <span class="score-label">综合评分</span>
            <span class="score-value" :class="getReportScoreClass(jobState.interview.currentReport.overallScore)">
              {{ jobState.interview.currentReport.overallScore }}
            </span>
          </div>
        </div>

        <div class="report-content">
          <div class="strengths-section">
            <h3>💪 优势</h3>
            <ul>
              <li v-for="(strength, i) in jobState.interview.currentReport.strengths" :key="i">
                {{ strength }}
              </li>
            </ul>
          </div>

          <div class="weaknesses-section">
            <h3>⚠️ 不足</h3>
            <ul>
              <li v-for="(weakness, i) in jobState.interview.currentReport.weaknesses" :key="i">
                {{ weakness }}
              </li>
            </ul>
          </div>

          <div class="review-section">
            <h3>📚 复习清单</h3>
            <ul>
              <li v-for="(item, i) in jobState.interview.currentReport.reviewList" :key="i">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <div class="report-actions">
          <button @click="resetInterview" class="btn-restart">
            🔄 重新面试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useAsr } from '../composables/useAsr'
import { jobState, jobStore } from '../stores/job'
import { JOB_POSITIONS } from '../constants'
import type { AppState, AppStore, PositionType, InterviewQuestion } from '../types'

const emit = defineEmits<{
  switchModule: [module: 'resume' | 'interview' | 'jobMatch' | 'materials']
  questionGenerated: [question: string]
  answerSubmitted: [feedback: string]
}>()

const appState = inject<AppState>('appState')!
const appStore = inject<AppStore>('appStore')!

const positionList = JOB_POSITIONS
const answerText = ref('')
let stopAsrFn: (() => void) | null = null

const currentQuestion = computed<InterviewQuestion | null>(() => {
  return jobStore.getCurrentInterviewQuestion()
})

const currentAnswer = computed(() => {
  const progress = jobStore.getInterviewProgress()
  return jobState.interview.answers[progress.current - 1] || null
})

const hasNextQuestion = computed(() => {
  const progress = jobStore.getInterviewProgress()
  return progress.current < progress.total
})

function selectPosition(position: PositionType) {
  jobStore.setInterviewPosition(position)
}

async function startInterview() {
  if (!appState.llm.apiKey) {
    alert('请先在设置中配置API密钥')
    return
  }

  try {
    await jobStore.startInterview()
    setTimeout(() => {
      const question = jobStore.getCurrentInterviewQuestion()
      if (question) {
        emit('questionGenerated', question.question)
      }
    }, 500)
  } catch (error: any) {
    alert(error.message || '启动面试失败')
  }
}

async function submitAnswer() {
  if (!answerText.value.trim()) return

  try {
    await jobStore.submitAnswer(answerText.value)
    answerText.value = ''
    
    setTimeout(() => {
      const answer = currentAnswer.value
      if (answer) {
        const feedback = `您的回答得分${answer.score}分。${answer.feedback}。${answer.improvement}`
        emit('answerSubmitted', feedback)
      }
    }, 300)
  } catch (error: any) {
    alert(error.message || '提交失败')
  }
}

function nextQuestion() {
  jobStore.nextQuestion()
  answerText.value = ''
  
  setTimeout(() => {
    const question = jobStore.getCurrentInterviewQuestion()
    if (question) {
      emit('questionGenerated', question.question)
    }
  }, 300)
}

async function finishInterview() {
  try {
    await jobStore.finishInterview()
  } catch (error: any) {
    alert(error.message || '生成报告失败')
  }
}

function resetInterview() {
  jobStore.resetInterview()
  answerText.value = ''
  stopAsr()
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

  appStore.startVoiceInput({
    onFinished: () => {},
    onError: () => {}
  })

  startNewAsr({
    onFinished: (text) => {
      answerText.value = (answerText.value ? answerText.value + '\n' : '') + text
    },
    onError: () => {}
  })
}

function stopAsr() {
  if (stopAsrFn) {
    stopAsrFn()
  }
}

function getQuestionTypeLabel(type: string | undefined): string {
  const labels: Record<string, string> = {
    self_intro: '自我介绍',
    project: '项目经历',
    scenario: '情景题',
    stress: '压力面',
    professional: '专业题'
  }
  return labels[type || ''] || '未知'
}

function getDifficultyLabel(difficulty: string | undefined): string {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return labels[difficulty || ''] || '未知'
}

function getScoreClass(score: number | undefined): string {
  const s = score || 0
  if (s >= 80) return 'excellent'
  if (s >= 60) return 'good'
  if (s >= 40) return 'average'
  return 'poor'
}

function getReportScoreClass(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'average'
  return 'poor'
}
</script>

<style scoped>
.interview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.panel-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title .icon {
  font-size: 28px;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.setup-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setup-section h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.position-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.position-btn:hover {
  border-color: #f5576c;
}

.position-btn.active {
  border-color: #f5576c;
  background: #fff5f7;
}

.pos-icon {
  font-size: 32px;
}

.pos-label {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.btn-start {
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  transition: width 0.3s;
}

.progress-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 20px;
}

.question-card {
  background: #f9f9f9;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.question-type {
  font-size: 13px;
  padding: 4px 12px;
  background: #f0f0f0;
  border-radius: 12px;
  color: #333;
}

.difficulty {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.difficulty.easy {
  background: #dcfce7;
  color: #16a34a;
}

.difficulty.medium {
  background: #fef3c7;
  color: #d97706;
}

.difficulty.hard {
  background: #fee2e2;
  color: #dc2626;
}

.question-text {
  font-size: 16px;
  color: #333;
  line-height: 1.8;
  margin: 0 0 16px 0;
}

.question-hint {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.answer-section {
  margin-bottom: 20px;
}

.answer-section textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.8;
  resize: none;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.answer-section textarea:focus {
  outline: none;
  border-color: #f5576c;
}

.answer-actions {
  display: flex;
  gap: 12px;
}

.btn-voice {
  flex: 1;
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  color: #333;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-voice:hover:not(:disabled) {
  border-color: #f5576c;
  background: #fff5f7;
}

.btn-voice.listening {
  border-color: #f5576c;
  background: linear-gradient(135deg, #fff5f7 0%, #ffdddd 100%);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.btn-voice .icon {
  font-size: 18px;
}

.btn-voice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-submit {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
}

.feedback-header {
  margin-bottom: 16px;
}

.feedback-score {
  font-size: 32px;
  font-weight: 700;
}

.feedback-score.excellent { color: #16a34a; }
.feedback-score.good { color: #d97706; }
.feedback-score.average { color: #f59e0b; }
.feedback-score.poor { color: #dc2626; }

.feedback-body {
  margin-bottom: 16px;
}

.feedback-body p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-next,
.btn-finish {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next:hover,
.btn-finish:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.report-header {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: white;
  margin-bottom: 24px;
}

.report-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 16px;
  opacity: 0.9;
}

.score-value {
  font-size: 72px;
  font-weight: 700;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.report-content h3 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #333;
}

.report-content ul {
  margin: 0;
  padding-left: 20px;
}

.report-content li {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
}

.strengths-section {
  background: #f0fdf4;
  padding: 20px;
  border-radius: 12px;
}

.weaknesses-section {
  background: #fffbeb;
  padding: 20px;
  border-radius: 12px;
}

.review-section {
  background: #f0f7ff;
  padding: 20px;
  border-radius: 12px;
}

.report-actions {
  display: flex;
  gap: 12px;
}

.btn-restart {
  flex: 1;
  padding: 14px;
  border: 2px solid #f5576c;
  border-radius: 12px;
  background: white;
  color: #f5576c;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restart:hover {
  background: #f5576c;
  color: white;
}
</style>