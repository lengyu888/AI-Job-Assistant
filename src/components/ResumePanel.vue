<template>
  <div class="resume-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="icon">📄</span>
        <h2>AI简历优化</h2>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="!jobState.resume.file" class="upload-section">
        <div
          class="upload-area"
          :class="{ dragover: isDragover }"
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragover = true"
          @dragleave="isDragover = false"
          @click="triggerFileInput"
        >
          <div class="upload-icon">📎</div>
          <p class="upload-text">拖拽或点击上传简历</p>
          <p class="upload-hint">支持 PDF、Word、TXT 格式</p>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          @change="handleFileSelect"
          style="display: none"
        />
      </div>

      <div v-else class="analysis-section">
        <div class="file-info">
          <span class="file-icon">📎</span>
          <span class="file-name">{{ jobState.resume.file.name }}</span>
          <button @click="clearResume" class="btn-clear">×</button>
        </div>

        <div v-if="jobState.resume.isAnalyzing" class="loading-state">
          <div class="spinner"></div>
          <p>正在分析简历...</p>
        </div>

        <div v-else-if="jobState.resume.analysisResult" class="result-section">
          <div class="score-card">
            <div class="score-header">
              <span class="score-label">简历评分</span>
              <span class="score-value" :class="scoreClass">
                {{ jobState.resume.analysisResult.score.total }}
              </span>
            </div>
            <div class="score-details">
              <div class="score-item">
                <span class="label">关键词匹配</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (jobState.resume.analysisResult.score.keywordMatch / 20 * 100) + '%' }"></div>
                </div>
                <span class="score-num">{{ jobState.resume.analysisResult.score.keywordMatch }}/20</span>
              </div>
              <div class="score-item">
                <span class="label">经历量化</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (jobState.resume.analysisResult.score.quantification / 25 * 100) + '%' }"></div>
                </div>
                <span class="score-num">{{ jobState.resume.analysisResult.score.quantification }}/25</span>
              </div>
              <div class="score-item">
                <span class="label">排版结构</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (jobState.resume.analysisResult.score.structure / 15 * 100) + '%' }"></div>
                </div>
                <span class="score-num">{{ jobState.resume.analysisResult.score.structure }}/15</span>
              </div>
              <div class="score-item">
                <span class="label">成就亮点</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (jobState.resume.analysisResult.score.highlight / 20 * 100) + '%' }"></div>
                </div>
                <span class="score-num">{{ jobState.resume.analysisResult.score.highlight }}/20</span>
              </div>
              <div class="score-item">
                <span class="label">整体完整</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (jobState.resume.analysisResult.score.completeness / 20 * 100) + '%' }"></div>
                </div>
                <span class="score-num">{{ jobState.resume.analysisResult.score.completeness }}/20</span>
              </div>
            </div>
          </div>

          <div v-if="jobState.resume.analysisResult.issues.length > 0" class="issues-section">
            <h3>诊断问题</h3>
            <div
              v-for="(issue, index) in jobState.resume.analysisResult.issues"
              :key="index"
              class="issue-item"
              :class="issue.severity"
            >
              <div class="issue-header">
                <span class="issue-category">{{ getCategoryLabel(issue.category) }}</span>
                <span class="issue-severity">{{ getSeverityLabel(issue.severity) }}</span>
              </div>
              <p class="issue-desc">{{ issue.description }}</p>
              <p class="issue-suggestion">💡 {{ issue.suggestion }}</p>
            </div>
          </div>

          <div class="optimized-section">
            <div class="section-header">
              <h3>优化后简历</h3>
              <button
                @click="reOptimize"
                :disabled="jobState.resume.isOptimizing"
                class="btn-retry"
              >
                {{ jobState.resume.isOptimizing ? '优化中...' : '🔄 重新优化' }}
              </button>
            </div>
            <div class="optimized-content">
              <pre>{{ jobState.resume.analysisResult.optimizedResume }}</pre>
            </div>
          </div>

          <div v-if="jobState.resume.analysisResult.layoutSuggestion" class="layout-section">
            <h3>排版建议</h3>
            <p>{{ jobState.resume.analysisResult.layoutSuggestion }}</p>
          </div>

          <div class="action-buttons">
            <button @click="exportResume" class="btn-export">
              📥 导出简历
            </button>
            <button @click="goToJobMatch" class="btn-match">
              🎯 岗位匹配
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { jobState, jobStore } from '../stores/job'
import type { AppState } from '../types'

const emit = defineEmits<{
  openSettings: []
  switchModule: [module: 'jobMatch']
  analyzeComplete: []
}>()

const appState = inject<AppState>('appState')!

const isDragover = ref(false)
const fileInput = ref<HTMLInputElement>()

const scoreClass = computed(() => {
  const score = jobState.resume.analysisResult?.score.total || 0
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'average'
  return 'poor'
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleDrop(event: DragEvent) {
  isDragover.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    handleFile(file)
  }
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await handleFile(file)
  }
  target.value = ''
}

async function handleFile(file: File) {
  if (!appState.llm.apiKey) {
    alert('请先在设置中配置API密钥')
    emit('openSettings')
    return
  }

  try {
    await jobStore.uploadAndAnalyzeResume(file)
    emit('analyzeComplete')
  } catch (error: any) {
    alert(error.message || '简历分析失败')
  }
}

function clearResume() {
  jobStore.clearResume()
}

async function reOptimize() {
  if (!appState.llm.apiKey) {
    alert('请先在设置中配置API密钥')
    return
  }

  try {
    await jobStore.reOptimizeResume()
  } catch (error: any) {
    alert(error.message || '优化失败')
  }
}

function exportResume() {
  try {
    jobStore.exportOptimizedResume()
    alert('简历已导出')
  } catch (error: any) {
    alert(error.message || '导出失败')
  }
}

function goToJobMatch() {
  emit('switchModule', 'jobMatch')
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    keyword: '关键词',
    quantification: '量化',
    structure: '结构',
    highlight: '亮点',
    completeness: '完整'
  }
  return labels[category] || category
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    high: '严重',
    medium: '中等',
    low: '轻微'
  }
  return labels[severity] || severity
}
</script>

<style scoped>
.resume-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.upload-section {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area {
  width: 100%;
  max-width: 400px;
  padding: 60px 40px;
  border: 2px dashed #d4c4a8;
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin: 0 0 8px 0;
}

.upload-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 20px;
}

.file-icon {
  font-size: 24px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-clear {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #e74c3c;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  margin: 0;
}

.score-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  margin-bottom: 24px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.score-label {
  font-size: 16px;
  font-weight: 600;
}

.score-value {
  font-size: 48px;
  font-weight: 700;
}

.score-value.excellent { color: #4ade80; }
.score-value.good { color: #facc15; }
.score-value.average { color: #fb923c; }
.score-value.poor { color: #f87171; }

.score-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-item {
  display: grid;
  grid-template-columns: 80px 1fr 60px;
  gap: 12px;
  align-items: center;
}

.score-item .label {
  font-size: 13px;
  opacity: 0.9;
}

.score-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: white;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.score-num {
  font-size: 13px;
  text-align: right;
}

.issues-section,
.optimized-section,
.layout-section {
  margin-bottom: 24px;
}

.issues-section h3,
.optimized-section h3,
.layout-section h3 {
  font-size: 16px;
  color: #333;
  margin: 0 0 16px 0;
}

.issue-item {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.issue-item.high {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.issue-item.medium {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.issue-item.low {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.issue-category {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.issue-severity {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.issue-item.high .issue-severity {
  background: #fee2e2;
  color: #dc2626;
}

.issue-item.medium .issue-severity {
  background: #fef3c7;
  color: #d97706;
}

.issue-item.low .issue-severity {
  background: #dcfce7;
  color: #16a34a;
}

.issue-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 8px 0;
}

.issue-suggestion {
  font-size: 13px;
  color: #333;
  margin: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-retry {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #f0f0f0;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.btn-retry:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.optimized-content {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.optimized-content pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.layout-section {
  padding: 20px;
  background: #f0f7ff;
  border-radius: 12px;
}

.layout-section p {
  margin: 0;
  font-size: 14px;
  color: #333;
  line-height: 1.8;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-export,
.btn-match {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-match {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-match:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}
</style>