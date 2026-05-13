import { reactive } from 'vue'
import { appState } from './app'
import { resumeService } from '../services/resume'
import { interviewService } from '../services/interview'
import { jobMatchService } from '../services/jobMatch'
import type { ResumeInfo, ResumeAnalysisResult, PositionType, InterviewQuestion, InterviewAnswer, InterviewReport, JobMatchResult } from '../types'

export type ActiveModule = 'resume' | 'interview' | 'jobMatch' | 'materials'

export interface JobState {
  activeModule: ActiveModule
  resume: {
    file: File | null
    info: ResumeInfo | null
    analysisResult: ResumeAnalysisResult | null
    isAnalyzing: boolean
    isOptimizing: boolean
  }
  interview: {
    position: PositionType
    questions: InterviewQuestion[]
    currentQuestionIndex: number
    answers: InterviewAnswer[]
    currentReport: InterviewReport | null
    isGenerating: boolean
    isEvaluating: boolean
    isCompleted: boolean
  }
  jobMatch: {
    result: JobMatchResult | null
    isAnalyzing: boolean
  }
  ui: {
    isAiSpeaking: boolean
    isListening: boolean
  }
}

export const jobState = reactive<JobState>({
  activeModule: 'resume',
  resume: {
    file: null,
    info: null,
    analysisResult: null,
    isAnalyzing: false,
    isOptimizing: false
  },
  interview: {
    position: 'product',
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    currentReport: null,
    isGenerating: false,
    isEvaluating: false,
    isCompleted: false
  },
  jobMatch: {
    result: null,
    isAnalyzing: false
  },
  ui: {
    isAiSpeaking: false,
    isListening: false
  }
})

class JobStore {
  setActiveModule(module: ActiveModule): void {
    jobState.activeModule = module
  }

  async uploadAndAnalyzeResume(file: File): Promise<void> {
    jobState.resume.isAnalyzing = true
    jobState.resume.file = file

    try {
      const info = await resumeService.parseResume(file)
      jobState.resume.info = info

      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      const result = await resumeService.analyzeAndOptimize(config, info)
      jobState.resume.analysisResult = result
    } catch (error) {
      console.error('简历分析失败:', error)
      throw error
    } finally {
      jobState.resume.isAnalyzing = false
    }
  }

  async reOptimizeResume(_customPrompt?: string): Promise<void> {
    if (!jobState.resume.info) {
      throw new Error('请先上传简历')
    }

    jobState.resume.isOptimizing = true

    try {
      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      const result = await resumeService.analyzeAndOptimize(config, jobState.resume.info)
      jobState.resume.analysisResult = result
    } catch (error) {
      console.error('简历优化失败:', error)
      throw error
    } finally {
      jobState.resume.isOptimizing = false
    }
  }

  exportOptimizedResume(): void {
    if (!jobState.resume.analysisResult) {
      throw new Error('没有可导出的简历')
    }
    resumeService.exportOptimizedResume(jobState.resume.analysisResult.optimizedResume)
  }

  clearResume(): void {
    jobState.resume = {
      file: null,
      info: null,
      analysisResult: null,
      isAnalyzing: false,
      isOptimizing: false
    }
  }

  setInterviewPosition(position: PositionType): void {
    jobState.interview.position = position
    interviewService.setPosition(position)
  }

  async startInterview(): Promise<void> {
    jobState.interview.isGenerating = true
    jobState.interview.questions = []
    jobState.interview.answers = []
    jobState.interview.currentReport = null
    jobState.interview.isCompleted = false

    try {
      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      interviewService.reset()
      interviewService.setPosition(jobState.interview.position)

      const questions = await interviewService.generateQuestions(config)
      jobState.interview.questions = questions
      jobState.interview.currentQuestionIndex = 0
    } catch (error) {
      console.error('生成面试问题失败:', error)
      throw error
    } finally {
      jobState.interview.isGenerating = false
    }
  }

  async submitAnswer(answer: string): Promise<void> {
    const currentQuestion = jobState.interview.questions[jobState.interview.currentQuestionIndex]
    if (!currentQuestion) {
      throw new Error('当前没有问题')
    }

    jobState.interview.isEvaluating = true

    try {
      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      const evaluatedAnswer = await interviewService.evaluateAnswer(config, currentQuestion, answer)
      interviewService.recordAnswer(evaluatedAnswer)
      jobState.interview.answers.push(evaluatedAnswer)
    } catch (error) {
      console.error('评估回答失败:', error)
      throw error
    } finally {
      jobState.interview.isEvaluating = false
    }
  }

  nextQuestion(): boolean {
    if (jobState.interview.currentQuestionIndex < jobState.interview.questions.length - 1) {
      jobState.interview.currentQuestionIndex++
      return true
    }
    return false
  }

  async finishInterview(): Promise<void> {
    jobState.interview.isGenerating = true

    try {
      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      const resumeText = jobState.resume.info?.rawText
      const report = await interviewService.generateReport(config, resumeText)
      jobState.interview.currentReport = report
      jobState.interview.isCompleted = true
      interviewService.exportReport(report)
    } catch (error) {
      console.error('生成面试报告失败:', error)
      throw error
    } finally {
      jobState.interview.isGenerating = false
    }
  }

  resetInterview(): void {
    jobState.interview = {
      position: jobState.interview.position,
      questions: [],
      currentQuestionIndex: 0,
      answers: [],
      currentReport: null,
      isGenerating: false,
      isEvaluating: false,
      isCompleted: false
    }
    interviewService.reset()
  }

  async analyzeJobMatch(): Promise<void> {
    if (!jobState.resume.info) {
      throw new Error('请先上传简历')
    }

    jobState.jobMatch.isAnalyzing = true

    try {
      const config = {
        provider: 'openai',
        model: appState.llm.model,
        apiKey: appState.llm.apiKey
      }
      if (!config.apiKey) {
        throw new Error('请先配置API密钥')
      }

      const result = await jobMatchService.analyzeAndMatch(config, jobState.resume.info)
      jobState.jobMatch.result = result
    } catch (error) {
      console.error('岗位匹配分析失败:', error)
      throw error
    } finally {
      jobState.jobMatch.isAnalyzing = false
    }
  }

  exportJobMatchResult(): void {
    if (!jobState.jobMatch.result) {
      throw new Error('没有可导出的分析结果')
    }
    jobMatchService.exportMatchResult(jobState.jobMatch.result)
  }

  getCurrentInterviewQuestion(): InterviewQuestion | null {
    return jobState.interview.questions[jobState.interview.currentQuestionIndex] || null
  }

  getInterviewProgress(): { current: number; total: number } {
    return {
      current: jobState.interview.currentQuestionIndex + 1,
      total: jobState.interview.questions.length
    }
  }
}

export const jobStore = new JobStore()