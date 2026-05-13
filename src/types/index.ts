// 虚拟人相关类型定义
export interface AvatarConfig {
  appId: string
  appSecret: string
}

export interface AvatarState {
  connected: boolean
  speaking: boolean
  thinking: boolean
}

// ASR相关类型定义
export interface AsrConfig {
  provider: 'tx' // 目前只支持腾讯云
  appId: string | number
  secretId: string
  secretKey: string
  vadSilenceTime?: number
}

export interface AsrCallbacks {
  onFinished: (text: string) => void
  onError: (error: any) => void
}

// LLM相关类型定义
export interface LlmConfig {
  provider: string
  model: string
  apiKey: string
  baseURL?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Store类型定义
export interface AppStore {
  connectAvatar(): Promise<void>
  disconnectAvatar(): void
  sendMessage(): Promise<string | undefined>
  startVoiceInput(callbacks: AsrCallbacks): void
  stopVoiceInput(): void
}

// Store状态类型定义
export interface AppState {
  // 虚拟人配置
  avatar: {
    appId: string
    appSecret: string
    connected: boolean
    instance: any
  }

  // ASR配置
  asr: {
    provider: string
    appId: string | number
    secretId: string
    secretKey: string
    isListening: boolean
  }

  // LLM配置
  llm: {
    model: string
    apiKey: string
  }

  // UI状态
  ui: {
    text: string
    subTitleText: string
  }
}

// SDK事件类型定义
export interface SdkEvent {
  type: 'subtitle_on' | 'subtitle_off' | string
  text?: string
  [key: string]: any
}

// 简历相关类型定义
export type PositionType = 'product' | 'operation' | 'development' | 'design' | 'admin' | 'marketing' | 'sales' | 'hr' | 'finance' | 'data' | 'consulting' | 'supply_chain'

export interface ResumeInfo {
  name?: string
  email?: string
  phone?: string
  education?: string
  workExperience?: string
  projectExperience?: string
  skills?: string
  selfEvaluation?: string
  rawText?: string
}

export interface ResumeScore {
  total: number
  keywordMatch: number
  quantification: number
  structure: number
  highlight: number
  completeness: number
}

export interface ResumeIssue {
  category: 'keyword' | 'quantification' | 'structure' | 'highlight' | 'completeness'
  severity: 'high' | 'medium' | 'low'
  description: string
  suggestion: string
}

export interface ResumeAnalysisResult {
  score: ResumeScore
  issues: ResumeIssue[]
  optimizedResume: string
  layoutSuggestion: string
}

// 面试相关类型定义
export interface InterviewQuestion {
  id: string
  type: 'self_intro' | 'project' | 'scenario' | 'stress' | 'professional'
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
  scoringCriteria: string
}

export interface InterviewAnswer {
  questionId: string
  content: string
  score?: number
  feedback?: string
  improvement?: string
  timestamp: number
}

export interface InterviewReport {
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  reviewList: string[]
  detailedFeedback: {
    questionId: string
    question: string
    answer: string
    score: number
    feedback: string
  }[]
}

// 岗位匹配相关类型定义
export interface JobMatchResult {
  analyzedSkills: string[]
 擅长方向: string[]
  recommendedJobs: {
    position: PositionType
    positionLabel: string
    matchScore: number
    competitiveness: string
    gapAnalysis: string
  }[]
  actionPlan: string[]
}

// 素材库相关类型定义
export interface SelfIntroTemplate {
  title: string
  content: string
}

export interface CommonQATemplate {
  question: string
  answer: string
}

export interface ProjectWrapTemplate {
  type: string
  templates: readonly string[]
}

export interface TimelineEvent {
  month: string
  event: string
}

export interface TipItem {
  title: string
  content: string
}

// 全局窗口类型扩展
declare global {
  interface Window {
    XmovAvatar: any
    CryptoJSTest: any
    CryptoJS: any
    WebAudioSpeechRecognizer: any
  }
}
