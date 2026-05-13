import { MATERIALS_CONFIG } from '../constants'
import type { SelfIntroTemplate, CommonQATemplate, ProjectWrapTemplate, TimelineEvent, TipItem } from '../types'

export class MaterialsService {
  getSelfIntroTemplates(): readonly SelfIntroTemplate[] {
    return MATERIALS_CONFIG.TEMPLATES.SELF_INTRO
  }

  getCommonQATemplates(): readonly CommonQATemplate[] {
    return MATERIALS_CONFIG.TEMPLATES.COMMON_QA
  }

  getProjectWrapTemplates(): readonly ProjectWrapTemplate[] {
    return MATERIALS_CONFIG.TEMPLATES.PROJECT_WRAP
  }

  getSchoolTimeline(): readonly TimelineEvent[] {
    return MATERIALS_CONFIG.TIMELINE.school
  }

  getGraduateTimeline(): readonly TimelineEvent[] {
    return MATERIALS_CONFIG.TIMELINE.graduate
  }

  getWrittenTips(): readonly TipItem[] {
    return MATERIALS_CONFIG.TIPS.written
  }

  getInterviewTips(): readonly TipItem[] {
    return MATERIALS_CONFIG.TIPS.interview
  }

  exportTemplate(template: SelfIntroTemplate | CommonQATemplate): void {
    const content = 'title' in template
      ? `# ${template.title}\n\n${template.content}`
      : `# ${template.question}\n\n${template.answer}`

    const filename = 'title' in template
      ? `${template.title.replace(/\s+/g, '_')}.txt`
      : `${template.question.substring(0, 20).replace(/\s+/g, '_')}.txt`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  exportAllMaterials(): void {
    const content = this.buildMaterialsContent()
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `求职素材库_${new Date().toLocaleDateString()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  private buildMaterialsContent(): string {
    const templates = MATERIALS_CONFIG.TEMPLATES
    const tips = MATERIALS_CONFIG.TIPS
    const timeline = MATERIALS_CONFIG.TIMELINE

    let content = '# 求职素材库\n\n'

    content += '## 自我介绍模板\n\n'
    for (const template of templates.SELF_INTRO) {
      content += `### ${template.title}\n${template.content}\n\n`
    }

    content += '## 高频问答\n\n'
    for (const qa of templates.COMMON_QA) {
      content += `### ${qa.question}\n${qa.answer}\n\n`
    }

    content += '## 项目包装话术\n\n'
    for (const group of templates.PROJECT_WRAP) {
      content += `### ${group.type}\n`
      for (const t of group.templates) {
        content += `- ${t}\n`
      }
      content += '\n'
    }

    content += '## 校招时间线\n\n'
    content += '### 校招生\n'
    for (const event of timeline.school) {
      content += `- ${event.month}: ${event.event}\n`
    }
    content += '\n### 社招生\n'
    for (const event of timeline.graduate) {
      content += `- ${event.month}: ${event.event}\n`
    }
    content += '\n'

    content += '## 笔试技巧\n\n'
    for (const tip of tips.written) {
      content += `### ${tip.title}\n${tip.content}\n\n`
    }

    content += '## 面试技巧\n\n'
    for (const tip of tips.interview) {
      content += `### ${tip.title}\n${tip.content}\n\n`
    }

    return content
  }
}

export const materialsService = new MaterialsService()