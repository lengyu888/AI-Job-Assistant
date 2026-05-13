import type { ResumeInfo, JobMatchResult, PositionType, LlmConfig } from '../types'
import { JOB_MATCH_CONFIG, JOB_POSITIONS } from '../constants'
import { llmService } from './llm'

export class JobMatchService {
  async analyzeAndMatch(config: LlmConfig, resumeInfo: ResumeInfo): Promise<JobMatchResult> {
    const prompt = this.buildMatchPrompt(resumeInfo)

    try {
      const response = await llmService.sendMessage(config, prompt)
      if (!response) {
        return this.getDefaultMatchResult()
      }
      return this.parseMatchResponse(response)
    } catch (error) {
      console.error('岗位匹配分析失败:', error)
      return this.getDefaultMatchResult()
    }
  }

  private buildMatchPrompt(resumeInfo: ResumeInfo): string {
    const resumeText = resumeInfo.rawText || `
姓名: ${resumeInfo.name || '未知'}
教育背景: ${resumeInfo.education || ''}
工作经历: ${resumeInfo.workExperience || ''}
项目经历: ${resumeInfo.projectExperience || ''}
技能: ${resumeInfo.skills || ''}
自我评价: ${resumeInfo.selfEvaluation || ''}
`.trim()

    const availablePositions = JOB_POSITIONS.map(p => `${p.value}: ${p.label}`).join(', ')

    return `${JOB_MATCH_CONFIG.SYSTEM_PROMPT}

请分析以下简历，给出详细的岗位匹配分析：

${resumeText}

可选岗位类型：${availablePositions}

请按以下JSON格式输出分析结果：
{
  "analyzedSkills": ["技能1", "技能2", "技能3"],
  "擅长方向": ["方向1", "方向2"],
  "recommendedJobs": [
    {
      "position": "岗位类型",
      "positionLabel": "岗位名称",
      "matchScore": 匹配度分数,
      "competitiveness": "竞争力分析",
      "gapAnalysis": "差距分析"
    }
  ],
  "actionPlan": ["行动计划1", "行动计划2", "行动计划3"]
}`
  }

  private getDefaultMatchResult(): JobMatchResult {
    return {
      analyzedSkills: ['数据分析', '产品规划', '用户调研', '项目管理', '沟通协调'],
      擅长方向: ['互联网产品', '用户增长', '数据分析'],
      recommendedJobs: [
        {
          position: 'product',
          positionLabel: '产品经理',
          matchScore: 78,
          competitiveness: '具备一定的产品规划经验，数据分析能力待加强',
          gapAnalysis: '建议提升Axure等工具技能，加强用户研究方法论'
        },
        {
          position: 'operation',
          positionLabel: '运营',
          matchScore: 72,
          competitiveness: '有项目经验支撑，数据思维较好',
          gapAnalysis: '可加强活动策划和用户增长方法论'
        },
        {
          position: 'development',
          positionLabel: '开发',
          matchScore: 45,
          competitiveness: '技术背景较弱',
          gapAnalysis: '如非技术岗位，不建议强求'
        }
      ],
      actionPlan: [
        '完善简历中的数据化成果展示',
        '准备2-3个完整的产品项目故事',
        '学习并熟练使用Axure/Figma等产品工具',
        '了解目标公司行业动态和竞品信息'
      ]
    }
  }

  private parseMatchResponse(response: string): JobMatchResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('解析匹配结果失败:', error)
    }
    return this.getDefaultMatchResult()
  }

  getPositionList(): typeof JOB_POSITIONS {
    return JOB_POSITIONS
  }

  getPositionLabel(position: PositionType): string {
    const pos = JOB_POSITIONS.find(p => p.value === position)
    return pos?.label || '未知'
  }

  exportMatchResult(result: JobMatchResult): void {
    const content = `
# 岗位匹配分析报告

## 简历分析

### 技能标签
${result.analyzedSkills.map(s => `- ${s}`).join('\n')}

### 擅长方向
${result.擅长方向.map(d => `- ${d}`).join('\n')}

## 岗位推荐

${result.recommendedJobs.map(job => `
### ${job.positionLabel}
- 匹配度：${job.matchScore}分
- 竞争力分析：${job.competitiveness}
- 差距分析：${job.gapAnalysis}
`).join('\n')}

## 行动计划

${result.actionPlan.map((plan, i) => `${i + 1}. ${plan}`).join('\n')}
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `岗位匹配报告_${new Date().toLocaleDateString()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const jobMatchService = new JobMatchService()