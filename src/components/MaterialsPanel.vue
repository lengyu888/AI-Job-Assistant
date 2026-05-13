<template>
  <div class="materials-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="icon">📚</span>
        <h2>求职素材库</h2>
      </div>
      <button @click="exportAll" class="btn-export-all">
        📥 导出全部
      </button>
    </div>

    <div class="panel-content">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab-btn', { active: activeTab === tab.value }]"
          @click="activeTab = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <div v-if="activeTab === 'intro'" class="tab-content">
        <h3>自我介绍模板</h3>
        <div
          v-for="template in selfIntroTemplates"
          :key="template.title"
          class="template-card"
        >
          <div class="template-header">
            <h4>{{ template.title }}</h4>
            <button @click="exportTemplate(template)" class="btn-copy">
              📋 复制
            </button>
          </div>
          <pre class="template-content">{{ template.content }}</pre>
        </div>
      </div>

      <div v-if="activeTab === 'qa'" class="tab-content">
        <h3>高频问答</h3>
        <div
          v-for="qa in commonQATemplates"
          :key="qa.question"
          class="qa-card"
        >
          <div class="qa-question">
            <span class="q-icon">Q</span>
            <span>{{ qa.question }}</span>
          </div>
          <div class="qa-answer">
            <span class="a-icon">A</span>
            <pre>{{ qa.answer }}</pre>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'project'" class="tab-content">
        <h3>项目包装话术</h3>
        <div
          v-for="group in projectWrapTemplates"
          :key="group.type"
          class="project-group"
        >
          <h4>{{ group.type }}</h4>
          <div class="template-list">
            <div
              v-for="(tpl, index) in group.templates"
              :key="index"
              class="tpl-item"
            >
              <span class="tpl-icon">✓</span>
              <span>{{ tpl }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'timeline'" class="tab-content">
        <h3>校招时间线</h3>
        <div class="timeline-section">
          <h4>👨‍🎓 校招生</h4>
          <div class="timeline">
            <div
              v-for="event in schoolTimeline"
              :key="event.month"
              class="timeline-item"
            >
              <span class="timeline-month">{{ event.month }}</span>
              <span class="timeline-event">{{ event.event }}</span>
            </div>
          </div>
        </div>
        <div class="timeline-section">
          <h4>👔 社招生</h4>
          <div class="timeline">
            <div
              v-for="event in graduateTimeline"
              :key="event.month"
              class="timeline-item"
            >
              <span class="timeline-month">{{ event.month }}</span>
              <span class="timeline-event">{{ event.event }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'tips'" class="tab-content">
        <h3>求职技巧</h3>
        <div class="tips-section">
          <h4>✍️ 笔试技巧</h4>
          <div class="tips-list">
            <div
              v-for="tip in writtenTips"
              :key="tip.title"
              class="tip-card"
            >
              <h5>{{ tip.title }}</h5>
              <p>{{ tip.content }}</p>
            </div>
          </div>
        </div>
        <div class="tips-section">
          <h4>🎤 面试技巧</h4>
          <div class="tips-list">
            <div
              v-for="tip in interviewTips"
              :key="tip.title"
              class="tip-card"
            >
              <h5>{{ tip.title }}</h5>
              <p>{{ tip.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { materialsService } from '../services/materials'
import type { SelfIntroTemplate, CommonQATemplate, ProjectWrapTemplate, TimelineEvent, TipItem } from '../types'

const activeTab = ref('intro')

const tabs = [
  { value: 'intro', label: '自我介绍', icon: '🎤' },
  { value: 'qa', label: '高频问答', icon: '💬' },
  { value: 'project', label: '项目包装', icon: '📦' },
  { value: 'timeline', label: '时间线', icon: '📅' },
  { value: 'tips', label: '技巧', icon: '💡' }
]

let selfIntroTemplates: readonly SelfIntroTemplate[] = []
let commonQATemplates: readonly CommonQATemplate[] = []
let projectWrapTemplates: readonly ProjectWrapTemplate[] = []
let schoolTimeline: readonly TimelineEvent[] = []
let graduateTimeline: readonly TimelineEvent[] = []
let writtenTips: readonly TipItem[] = []
let interviewTips: readonly TipItem[] = []

onMounted(() => {
  selfIntroTemplates = materialsService.getSelfIntroTemplates()
  commonQATemplates = materialsService.getCommonQATemplates()
  projectWrapTemplates = materialsService.getProjectWrapTemplates()
  schoolTimeline = materialsService.getSchoolTimeline()
  graduateTimeline = materialsService.getGraduateTimeline()
  writtenTips = materialsService.getWrittenTips()
  interviewTips = materialsService.getInterviewTips()
})

function exportTemplate(template: SelfIntroTemplate | CommonQATemplate) {
  materialsService.exportTemplate(template)
}

function exportAll() {
  materialsService.exportAllMaterials()
}
</script>

<style scoped>
.materials-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #4776e6 0%, #8e54e9 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn-export-all {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export-all:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.tabs {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
}

.tab-btn {
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
  min-width: fit-content;
}

.tab-btn.active {
  background: white;
  border-bottom: 2px solid #8e54e9;
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 12px;
  color: #666;
}

.tab-btn.active .tab-label {
  color: #8e54e9;
  font-weight: 600;
}

.tab-content {
  padding: 24px;
}

.tab-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.template-card {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-header h4 {
  margin: 0;
  font-size: 15px;
  color: #333;
}

.btn-copy {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #8e54e9;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.template-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #666;
  white-space: pre-wrap;
  word-break: break-word;
}

.qa-card {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.qa-question {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.q-icon {
  width: 24px;
  height: 24px;
  background: #8e54e9;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.qa-question span:last-child {
  font-size: 14px;
  color: #333;
  font-weight: 600;
  line-height: 1.6;
}

.qa-answer {
  display: flex;
  gap: 12px;
  padding-left: 36px;
}

.a-icon {
  width: 24px;
  height: 24px;
  background: #11998e;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.qa-answer pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #666;
  white-space: pre-wrap;
}

.project-group {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.project-group h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #8e54e9;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tpl-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.tpl-icon {
  color: #38ef7d;
  font-weight: 600;
}

.timeline-section {
  margin-bottom: 24px;
}

.timeline-section:last-child {
  margin-bottom: 0;
}

.timeline-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 20px;
  border-left: 2px solid #e0e0e0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -25px;
  top: 4px;
  width: 8px;
  height: 8px;
  background: #8e54e9;
  border-radius: 50%;
}

.timeline-month {
  font-size: 13px;
  color: #8e54e9;
  font-weight: 600;
  min-width: 60px;
}

.timeline-event {
  font-size: 14px;
  color: #333;
}

.tips-section {
  margin-bottom: 24px;
}

.tips-section:last-child {
  margin-bottom: 0;
}

.tips-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.tips-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.tip-card {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
}

.tip-card h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.tip-card p {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}
</style>