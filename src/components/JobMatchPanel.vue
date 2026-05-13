<template>
  <div class="jobmatch-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="icon">🎯</span>
        <h2>岗位智能匹配</h2>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="!jobState.resume.info" class="no-resume">
        <div class="no-resume-icon">📋</div>
        <p>请先上传简历</p>
        <button @click="$emit('switchModule', 'resume')" class="btn-upload">
          去上传简历
        </button>
      </div>

      <div v-else-if="jobState.jobMatch.isAnalyzing" class="loading-state">
        <div class="spinner"></div>
        <p>正在分析简历...</p>
      </div>

      <div v-else-if="jobState.jobMatch.result" class="result-section">
        <div class="resume-info">
          <span class="info-icon">📎</span>
          <span class="info-text">已基于简历分析</span>
        </div>

        <div class="skills-section">
          <h3>📊 简历分析</h3>
          <div class="skills-tags">
            <span
              v-for="skill in jobState.jobMatch.result.analyzedSkills"
              :key="skill"
              class="skill-tag"
            >
              {{ skill }}
            </span>
          </div>
          <div class="strengths">
            <h4>擅长方向</h4>
            <div class="strength-tags">
              <span
                v-for="s in jobState.jobMatch.result.擅长方向"
                :key="s"
                class="strength-tag"
              >
                {{ s }}
              </span>
            </div>
          </div>
        </div>

        <div class="jobs-section">
          <h3>💼 推荐岗位</h3>
          <div
            v-for="job in jobState.jobMatch.result.recommendedJobs"
            :key="job.position"
            class="job-card"
            :class="{ top: job.matchScore >= 75 }"
          >
            <div class="job-header">
              <span class="job-icon">{{ getPositionIcon(job.position) }}</span>
              <span class="job-title">{{ job.positionLabel }}</span>
              <span
                class="job-score"
                :class="getScoreClass(job.matchScore)"
              >
                {{ job.matchScore }}分
              </span>
            </div>
            <div class="job-body">
              <p class="competitiveness">
                <strong>竞争力：</strong>{{ job.competitiveness }}
              </p>
              <p class="gap">
                <strong>差距：</strong>{{ job.gapAnalysis }}
              </p>
            </div>
          </div>
        </div>

        <div class="action-section">
          <h3>📋 行动计划</h3>
          <div class="action-list">
            <div
              v-for="(action, index) in jobState.jobMatch.result.actionPlan"
              :key="index"
              class="action-item"
            >
              <span class="action-num">{{ index + 1 }}</span>
              <span class="action-text">{{ action }}</span>
            </div>
          </div>
        </div>

        <div class="export-section">
          <button @click="exportResult" class="btn-export">
            📥 导出分析报告
          </button>
          <button @click="reAnalyze" class="btn-reanalyze">
            🔄 重新分析
          </button>
        </div>
      </div>

      <div v-else class="start-section">
        <div class="start-icon">🎯</div>
        <h3>智能岗位匹配</h3>
        <p>基于您的简历，AI将分析您的技能和经历，推荐最匹配的岗位方向</p>

        <div class="features">
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>技能分析</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">💼</span>
            <span>岗位推荐</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📋</span>
            <span>差距分析</span>
          </div>
        </div>

        <button @click="startAnalyze" class="btn-start">
          🚀 开始分析
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { jobState, jobStore } from '../stores/job'
import { JOB_POSITIONS } from '../constants'
import type { AppState } from '../types'

defineEmits<{
  switchModule: [module: 'resume']
}>()

const appState = inject<AppState>('appState')!

function getPositionIcon(position: string): string {
  const pos = JOB_POSITIONS.find(p => p.value === position)
  return pos?.icon || '💼'
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'excellent'
  if (score >= 60) return 'good'
  return 'average'
}

async function startAnalyze() {
  if (!appState.llm.apiKey) {
    alert('请先在设置中配置API密钥')
    return
  }

  try {
    await jobStore.analyzeJobMatch()
  } catch (error: any) {
    alert(error.message || '分析失败')
  }
}

async function reAnalyze() {
  try {
    await jobStore.analyzeJobMatch()
  } catch (error: any) {
    alert(error.message || '重新分析失败')
  }
}

function exportResult() {
  try {
    jobStore.exportJobMatchResult()
    alert('报告已导出')
  } catch (error: any) {
    alert(error.message || '导出失败')
  }
}
</script>

<style scoped>
.jobmatch-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

.no-resume {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.no-resume-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-resume p {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px 0;
}

.btn-upload {
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #38ef7d;
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

.start-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}

.start-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.start-section h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #333;
}

.start-section p {
  margin: 0 0 32px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.features {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.feature-icon {
  font-size: 32px;
}

.feature-item span:last-child {
  font-size: 13px;
  color: #333;
}

.btn-start {
  padding: 16px 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(56, 239, 125, 0.4);
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.resume-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.info-icon {
  font-size: 24px;
}

.info-text {
  font-size: 14px;
  color: #333;
}

.skills-section,
.jobs-section,
.action-section {
  background: #f9f9f9;
  border-radius: 16px;
  padding: 20px;
}

.skills-section h3,
.jobs-section h3,
.action-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.skill-tag {
  padding: 6px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 13px;
}

.strengths h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.strength-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.strength-tag {
  padding: 6px 14px;
  background: #11998e;
  color: white;
  border-radius: 20px;
  font-size: 13px;
}

.job-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 2px solid #e0e0e0;
}

.job-card:last-child {
  margin-bottom: 0;
}

.job-card.top {
  border-color: #38ef7d;
}

.job-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.job-icon {
  font-size: 24px;
}

.job-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.job-score {
  font-size: 20px;
  font-weight: 700;
}

.job-score.excellent { color: #16a34a; }
.job-score.good { color: #d97706; }
.job-score.average { color: #666; }

.job-body p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.job-body p:last-child {
  margin-bottom: 0;
}

.job-body strong {
  color: #333;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.action-num {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.action-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.export-section {
  display: flex;
  gap: 12px;
}

.btn-export,
.btn-reanalyze {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(56, 239, 125, 0.4);
}

.btn-reanalyze {
  background: #f0f0f0;
  color: #333;
}

.btn-reanalyze:hover {
  background: #e0e0e0;
}
</style>