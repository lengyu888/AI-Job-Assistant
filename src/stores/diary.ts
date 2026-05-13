import { reactive } from 'vue'
import { appState } from './app'
import { diaryService, type DiaryEntry } from '../services/diary'
import { getLLMResponse } from '../utils'

export interface DiaryConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface DiaryState {
  isDiaryMode: boolean
  isConversationActive: boolean
  conversationMessages: DiaryConversationMessage[]
  currentDiaryEntry: DiaryEntry | null
  isAiSpeaking: boolean
  isListening: boolean
}

export const diaryState = reactive<DiaryState>({
  isDiaryMode: false,
  isConversationActive: false,
  conversationMessages: [],
  currentDiaryEntry: null,
  isAiSpeaking: false,
  isListening: false
})

class DiaryStore {
  private conversationContext: string[] = []
  private diaryQuestions = [
    '今天过得怎么样？有什么特别的事情发生吗？',
    '今天天气如何？有没有出门？',
    '今天心情好不好？有什么让你开心的事情吗？',
    '今天有什么重要的事情想要记录下来吗？',
    '今天有没有遇到什么挑战？你是怎么应对的？',
    '今天有什么收获或者学习到新东西吗？',
    '今天有没有和家人朋友相处？有什么有趣的事情吗？',
    '今天晚上有什么计划吗？对明天有什么期待？'
  ]
  private currentQuestionIndex = 0

  async startDiaryMode(): Promise<void> {
    diaryState.isDiaryMode = true
    diaryState.conversationMessages = []
    diaryState.currentDiaryEntry = null
    this.conversationContext = []
    this.currentQuestionIndex = 0

    const greeting = await this.generateGreeting()
    this.addMessage('assistant', greeting)
  }

  async stopDiaryMode(): Promise<void> {
    if (diaryState.conversationMessages.length > 0) {
      await this.saveDiaryFromConversation()
    }

    diaryState.isDiaryMode = false
    diaryState.isConversationActive = false
    diaryState.conversationMessages = []
    this.conversationContext = []
  }

  async handleUserInput(text: string): Promise<void> {
    this.addMessage('user', text)
    this.conversationContext.push(`用户: ${text}`)

    const isRecallQuery = this.checkRecallQuery(text)

    if (isRecallQuery) {
      await this.handleRecallQuery(text)
    } else {
      await this.generateAiResponse(text)
    }
  }

  private checkRecallQuery(text: string): boolean {
    const recallKeywords = ['昨天', '前天', '上周', '那天', '那天', '什么时候', '记得', '回忆', '之前', '以前', '过去']
    const lowerText = text.toLowerCase()
    return recallKeywords.some(keyword => lowerText.includes(keyword))
  }

  private async handleRecallQuery(query: string): Promise<void> {
    const entries = diaryService.getAllEntries()
    const response = await diaryService.generateRecallResponse(query, entries)
    this.addMessage('assistant', response)
    this.conversationContext.push(`助手: ${response}`)
  }

  private async generateAiResponse(userMessage: string): Promise<void> {
    const llmConfig = appState.llm

    const contextPrompt = this.conversationContext.length > 0
      ? `之前的对话内容：\n${this.conversationContext.join('\n')}\n\n用户最新回答：${userMessage}`
      : `用户回答：${userMessage}`

    const prompt = `你是一个贴心的日记助手，正在和用户进行日常对话。

要求：
1. 根据用户的回答自然地继续对话，表现出关心和理解
2. 不要重复用户已经说过的内容
3. 如果用户回答比较简短，可以通过追问来获取更多信息
4. 每次只问一个问题
5. 当对话足够长（大约5-6轮）或者用户表示想结束时，主动提出帮用户保存日记

当前对话进度：第 ${this.currentQuestionIndex + 1} / ${this.diaryQuestions.length} 个问题

${contextPrompt}

请用简洁、温暖的语气回复（50字以内），可以追问一些问题来了解用户的一天。`

    try {
      diaryState.isAiSpeaking = true
      const response = await getLLMResponse({
        provider: 'openai',
        model: llmConfig.model,
        apiKey: llmConfig.apiKey
      }, prompt)

      this.addMessage('assistant', response)
      this.conversationContext.push(`助手: ${response}`)
      this.currentQuestionIndex++

      if (this.currentQuestionIndex >= this.diaryQuestions.length) {
        const savePrompt = '我们已经聊了很多关于今天的事情。我可以帮你把今天的日记保存下来吗？'
        this.addMessage('assistant', savePrompt)
        this.conversationContext.push(`助手: ${savePrompt}`)
      }
    } catch (error) {
      console.error('生成AI回复失败:', error)
      this.addMessage('assistant', '抱歉，我现在有点走神了，能再说一遍吗？')
    } finally {
      diaryState.isAiSpeaking = false
    }
  }

  async saveDiaryFromConversation(): Promise<void> {
    const conversationText = this.conversationContext.join('\n')
    const diaryEntry = await diaryService.generateDiaryFromConversation(conversationText)
    await diaryService.saveDiary(diaryEntry)
    diaryState.currentDiaryEntry = diaryEntry
  }

  async getTodayDiary(): Promise<DiaryEntry | null> {
    const today = new Date().toISOString().split('T')[0]
    return diaryService.getDiaryByDate(today)
  }

  async getYesterdayDiary(): Promise<DiaryEntry | null> {
    return diaryService.getYesterdayDiary()
  }

  async recallPastEvents(query: string): Promise<string> {
    const entries = diaryService.getAllEntries()
    return diaryService.generateRecallResponse(query, entries)
  }

  private async generateGreeting(): Promise<string> {
    const hour = new Date().getHours()
    let greeting = ''

    if (hour < 12) {
      greeting = '早上好！今天想和我聊聊吗？我可以帮你记录一天的点点滴滴。'
    } else if (hour < 18) {
      greeting = '下午好！今天有什么有趣的事情想和我分享吗？'
    } else {
      greeting = '晚上好！一天结束了，有什么想聊聊的吗？'
    }

    const todayDiary = await this.getTodayDiary()
    if (todayDiary) {
      greeting += ' 我看到你今天已经有日记了，想继续补充吗，还是重新开始新的对话？'
    } else {
      greeting += ' ' + this.diaryQuestions[0]
    }

    return greeting
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    diaryState.conversationMessages.push({
      role,
      content,
      timestamp: Date.now()
    })
  }

  clearConversation(): void {
    diaryState.conversationMessages = []
    this.conversationContext = []
    this.currentQuestionIndex = 0
  }

  getDiaryHistory(): DiaryEntry[] {
    return diaryService.getAllEntries()
  }

  async deleteDiary(date: string): Promise<void> {
    diaryService.deleteEntry(date)
  }
}

export const diaryStore = new DiaryStore()
