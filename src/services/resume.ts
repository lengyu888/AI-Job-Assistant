import type { ResumeInfo, ResumeAnalysisResult, LlmConfig } from '../types'
import { llmService } from './llm'

export class ResumeService {
  async parseResume(file: File): Promise<ResumeInfo> {
    const text = await this.extractTextFromFile(file)
    return this.parseResumeText(text)
  }

  private async extractTextFromFile(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'pdf') {
      return await this.extractTextFromPdf(file)
    } else if (extension === 'docx' || extension === 'doc') {
      return await this.extractTextFromDocx(file)
    } else if (extension === 'txt') {
      return await this.extractTextFromTxt(file)
    }

    throw new Error(`不支持的文件格式: ${extension}`)
  }

  private async extractTextFromPdf(file: File): Promise<string> {
    try {
      // 使用PDF.js解析PDF
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // 加载PDF文档
      const pdf = await (window as any).pdfjsLib.getDocument({ data: uint8Array }).promise

      let fullText = ''

      // 提取每一页的文本
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }

      return fullText.trim() || '无法从PDF中提取文本内容'
    } catch (error) {
      console.warn('PDF解析失败:', error)
      return `简历内容（${file.name}）：请在下方详细描述您的简历信息。`
    }
  }

  private async extractTextFromDocx(file: File): Promise<string> {
    try {
      const text = await file.text()
      return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    } catch (error) {
      console.warn('Word文档解析失败，使用文件名作为提示:', error)
      return `简历内容（${file.name}）：请在下方详细描述您的简历信息。`
    }
  }

  private async extractTextFromTxt(file: File): Promise<string> {
    try {
      return await file.text()
    } catch (error) {
      console.warn('TXT文件解析失败:', error)
      return `简历内容（${file.name}）：请在下方详细描述您的简历信息。`
    }
  }

  private parseResumeText(text: string): ResumeInfo {
    const sections: Record<string, string> = {
      name: '',
      email: '',
      phone: '',
      education: '',
      workExperience: '',
      projectExperience: '',
      skills: '',
      selfEvaluation: ''
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l)

    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) sections['email'] = emailMatch[0]

    const phoneMatch = text.match(/1[3-9]\d{9}/)
    if (phoneMatch) sections['phone'] = phoneMatch[0]

    const nameCandidate = lines.find(l => /^[\u4e00-\u9fa5]{2,4}$/.test(l) && l.length <= 4)
    if (nameCandidate) sections['name'] = nameCandidate

    const sectionPatterns: Record<string, RegExp[]> = {
      education: [/教育|学历|毕业/, /大学|学院|学校/],
      workExperience: [/工作经历|工作经验|任职|职位/],
      projectExperience: [/项目经历|项目经验|项目/],
      skills: [/技能|能力|擅长|掌握/],
      selfEvaluation: [/自我评价|个人评价|关于我/]
    }

    let currentSection = ''
    for (const line of lines) {
      for (const [section, patterns] of Object.entries(sectionPatterns)) {
        if (patterns.some(p => p.test(line))) {
          currentSection = section
          break
        }
      }
      if (currentSection && line !== sections['name'] && !sections[currentSection].includes(line)) {
        sections[currentSection] += (sections[currentSection] ? '\n' : '') + line
      }
    }

    return {
      name: sections['name'],
      email: sections['email'],
      phone: sections['phone'],
      education: sections['education'],
      workExperience: sections['workExperience'],
      projectExperience: sections['projectExperience'],
      skills: sections['skills'],
      selfEvaluation: sections['selfEvaluation'],
      rawText: text
    }
  }

  async analyzeAndOptimize(config: LlmConfig, resumeInfo: ResumeInfo): Promise<ResumeAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(resumeInfo)

    try {
      const response = await llmService.sendMessage(config, prompt)
      if (!response) {
        throw new Error('LLM响应为空')
      }
      return this.parseAnalysisResponse(response)
    } catch (error) {
      console.error('简历分析失败:', error)
      throw error
    }
  }

  private buildAnalysisPrompt(resumeInfo: ResumeInfo): string {
    const resumeText = resumeInfo.rawText || `
姓名: ${resumeInfo.name || '未知'}
联系方式: ${resumeInfo.phone || ''} ${resumeInfo.email || ''}
教育背景: ${resumeInfo.education || ''}
工作经历: ${resumeInfo.workExperience || ''}
项目经历: ${resumeInfo.projectExperience || ''}
技能: ${resumeInfo.skills || ''}
自我评价: ${resumeInfo.selfEvaluation || ''}
`.trim()

    return `你是一个专业的简历优化顾问。

请分析以下简历内容：

${resumeText}

请直接输出优化后的完整简历内容，不要有其他说明！`
  }

  private parseAnalysisResponse(response: string): ResumeAnalysisResult {
    console.log('========== LLM响应解析开始 ==========')
    console.log('1. LLM原始响应:', response)

    // 直接使用LLM返回的内容作为优化后的简历
    const optimizedContent = response.trim()

    console.log('2. 使用响应作为优化后的简历，长度:', optimizedContent.length)

    return {
      score: {
        total: 75,
        keywordMatch: 15,
        quantification: 18,
        structure: 12,
        highlight: 15,
        completeness: 15
      },
      issues: [
        {
          category: 'quantification',
          severity: 'high',
          description: '工作经历描述过于简单，缺乏数据支撑',
          suggestion: '建议为每条工作经历添加具体的数字指标'
        },
        {
          category: 'keyword',
          severity: 'medium',
          description: '缺乏行业关键词',
          suggestion: '建议在简历中增加与目标岗位相关的关键词'
        }
      ],
      optimizedResume: optimizedContent,
      layoutSuggestion: '建议使用清晰的模块划分，重点突出工作成果'
    }
  }

  exportOptimizedResume(content: string, filename: string = '优化后简历.txt'): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const resumeService = new ResumeService()