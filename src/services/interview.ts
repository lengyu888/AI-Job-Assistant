import type { PositionType, InterviewQuestion, InterviewAnswer, InterviewReport, LlmConfig } from '../types'
import { JOB_POSITIONS } from '../constants'
import { llmService } from './llm'

export class InterviewService {
  private currentAnswers: InterviewAnswer[] = []
  private currentPosition: PositionType = 'product'

  setPosition(position: PositionType): void {
    this.currentPosition = position
    this.currentAnswers = []
  }

  getPositionLabel(): string {
    const pos = JOB_POSITIONS.find(p => p.value === this.currentPosition)
    return pos?.label || '产品经理'
  }

  async generateQuestions(config: LlmConfig, count: number = 5): Promise<InterviewQuestion[]> {
    const prompt = `你是一个专业的面试官，请为${this.getPositionLabel()}岗位生成${count}道面试问题。

要求：
1. 问题类型要多样化：自我介绍、项目经历、情景题、压力面试、专业题
2. 每道问题要有评分标准
3. 问题难度要适中

请按以下JSON格式输出：
{
  "questions": [
    {
      "id": "q1",
      "type": "self_intro/project/scenario/stress/professional",
      "question": "问题内容",
      "difficulty": "easy/medium/hard",
      "scoringCriteria": "评分标准"
    }
  ]
}`

    try {
      const response = await llmService.sendMessage(config, prompt)
      if (!response) {
        return this.getDefaultQuestions()
      }
      return this.parseQuestionsResponse(response)
    } catch (error) {
      console.error('生成面试问题失败:', error)
      return this.getDefaultQuestions()
    }
  }

  private getDefaultQuestions(): InterviewQuestion[] {
    const positionLabel = this.getPositionLabel()
    return [
      {
        id: 'q1',
        type: 'self_intro',
        question: `请做一个${positionLabel}岗位的1-3分钟自我介绍`,
        difficulty: 'medium',
        scoringCriteria: '表达清晰度30分+岗位匹配度40分+个人亮点30分'
      },
      {
        id: 'q2',
        type: 'project',
        question: '请介绍一下你过去最成功的项目经历？请用STAR法则描述',
        difficulty: 'medium',
        scoringCriteria: 'STAR法则运用40分+成果量化30分+表达能力30分'
      },
      {
        id: 'q3',
        type: 'scenario',
        question: '假设你负责的产品遇到用户增长停滞，你会如何分析和解决？',
        difficulty: 'hard',
        scoringCriteria: '分析思路40分+解决方案30分+专业能力30分'
      },
      {
        id: 'q4',
        type: 'stress',
        question: '如果你的方案被领导否定了，你会怎么做？',
        difficulty: 'medium',
        scoringCriteria: '抗压能力30分+沟通能力40分+职业素养30分'
      },
      {
        id: 'q5',
        type: 'professional',
        question: `作为一个${positionLabel}，你认为最重要的能力是什么？为什么？`,
        difficulty: 'easy',
        scoringCriteria: '认知深度40分+结合实际30分+表达逻辑30分'
      }
    ]
  }

  private parseQuestionsResponse(response: string): InterviewQuestion[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions
        }
      }
    } catch (error) {
      console.error('解析面试问题失败:', error)
    }
    return this.getDefaultQuestions()
  }

  async evaluateAnswer(config: LlmConfig, question: InterviewQuestion, answer: string): Promise<InterviewAnswer> {
    const prompt = `你是一个专业的面试官，请评估求职者对以下问题的回答。

问题类型：${question.type}
问题内容：${question.question}
评分标准：${question.scoringCriteria}

求职者回答：
${answer}

请按以下JSON格式输出评估结果：
{
  "score": 分数(0-100),
  "feedback": "反馈优点",
  "improvement": "改进建议"
}`

    try {
      const response = await llmService.sendMessage(config, prompt)
      if (!response) {
        return {
          questionId: question.id,
          content: answer,
          score: 70,
          feedback: '回答基本符合要求',
          improvement: '可以更具体一些',
          timestamp: Date.now()
        }
      }
      return this.parseEvaluationResponse(question, answer, response)
    } catch (error) {
      console.error('评估回答失败:', error)
      return {
        questionId: question.id,
        content: answer,
        score: 70,
        feedback: '回答基本符合要求',
        improvement: '可以更具体一些',
        timestamp: Date.now()
      }
    }
  }

  private parseEvaluationResponse(question: InterviewQuestion, answer: string, response: string): InterviewAnswer {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          questionId: question.id,
          content: answer,
          score: parsed.score || 70,
          feedback: parsed.feedback || '回答合理',
          improvement: parsed.improvement || '可以进一步优化',
          timestamp: Date.now()
        }
      }
    } catch (error) {
      console.error('解析评估结果失败:', error)
    }
    return {
      questionId: question.id,
      content: answer,
      score: 70,
      feedback: '回答合理',
      improvement: '可以进一步优化',
      timestamp: Date.now()
    }
  }

  recordAnswer(answer: InterviewAnswer): void {
    this.currentAnswers.push(answer)
  }

  getCurrentAnswers(): InterviewAnswer[] {
    return this.currentAnswers
  }

  async generateReport(config: LlmConfig, resumeText?: string): Promise<InterviewReport> {
    const prompt = `你是一个专业的面试官，请根据以下面试记录生成最终面试报告。

面试岗位：${this.getPositionLabel()}
${resumeText ? `求职者简历：\n${resumeText}\n` : ''}

面试回答记录：
${this.currentAnswers.map((a, i) => `问题${i + 1}: ${a.content}\n评分: ${a.score}分\n反馈: ${a.feedback}\n`).join('\n')}

请按以下JSON格式输出面试报告：
{
  "overallScore": 综合评分(0-100),
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["不足1", "不足2"],
  "reviewList": ["复习清单1", "复习清单2"],
  "detailedFeedback": [
    {
      "questionId": "q1",
      "question": "问题内容",
      "answer": "回答内容",
      "score": 分数,
      "feedback": "反馈"
    }
  ]
}`

    try {
      const response = await llmService.sendMessage(config, prompt)
      if (!response) {
        return this.generateDefaultReport()
      }
      return this.parseReportResponse(response)
    } catch (error) {
      console.error('生成面试报告失败:', error)
      return this.generateDefaultReport()
    }
  }

  private generateDefaultReport(): InterviewReport {
    const answers = this.currentAnswers
    const totalScore = answers.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length)
      : 70

    return {
      overallScore: totalScore,
      strengths: [
        '具备基本的职业素养',
        '能够清晰表达自己的想法',
        '有一定的项目经验'
      ],
      weaknesses: [
        '回答可以更具体，添加更多数据支撑',
        '部分问题缺乏深度思考'
      ],
      reviewList: [
        '复习STAR法则，用更结构化的方式描述项目经历',
        '准备3-5个精彩的项目故事',
        '练习常见面试问题的回答'
      ],
      detailedFeedback: answers.map(a => ({
        questionId: a.questionId,
        question: '',
        answer: a.content,
        score: a.score || 70,
        feedback: a.feedback || ''
      }))
    }
  }

  private parseReportResponse(response: string): InterviewReport {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('解析报告结果失败:', error)
    }
    return this.generateDefaultReport()
  }

  exportReport(report: InterviewReport): void {
    const content = `
# 面试报告

## 综合评分
${report.overallScore}分

## 优势
${report.strengths.map(s => `- ${s}`).join('\n')}

## 不足
${report.weaknesses.map(w => `- ${w}`).join('\n')}

## 复习清单
${report.reviewList.map(r => `- ${r}`).join('\n')}

## 详细反馈
${report.detailedFeedback.map((d, i) => `
### 问题${i + 1}
- 问题：${d.question}
- 回答：${d.answer}
- 评分：${d.score}分
- 反馈：${d.feedback}
`).join('\n')}
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `面试报告_${new Date().toLocaleDateString()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  reset(): void {
    this.currentAnswers = []
  }
}

export const interviewService = new InterviewService()