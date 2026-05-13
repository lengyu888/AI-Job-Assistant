import { appState } from '../stores/app'
import { getLLMResponse } from '../utils'

export interface DiaryEntry {
  date: string
  content: string
  weather?: string
  mood?: string
  summary?: string
  createdAt: string
  updatedAt: string
}

export interface DiaryStore {
  entries: DiaryEntry[]
  currentDate: string
  isLoading: boolean
}

class DiaryService {
  private storageKey = 'diary_entries'

  private getDateStr(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]
  }

  private getFileName(date: string): string {
    return `diary_${date}.json`
  }

  async saveDiary(entry: DiaryEntry): Promise<void> {
    const entries = this.getAllEntries()
    const existingIndex = entries.findIndex(e => e.date === entry.date)

    if (existingIndex >= 0) {
      entries[existingIndex] = { ...entry, updatedAt: new Date().toISOString() }
    } else {
      entries.push({ ...entry, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }

    this.saveAllEntries(entries)
  }

  async saveDiaryToFile(entry: DiaryEntry): Promise<void> {
    const fileName = this.getFileName(entry.date)
    const content = JSON.stringify(entry, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    
    URL.revokeObjectURL(url)
  }

  async loadDiaryFromFile(file: File): Promise<DiaryEntry | null> {
    try {
      const content = await file.text()
      const entry = JSON.parse(content) as DiaryEntry
      return entry
    } catch (error) {
      console.error('加载日记文件失败:', error)
      return null
    }
  }

  async getDiaryByDate(date: string): Promise<DiaryEntry | null> {
    const entries = this.getAllEntries()
    return entries.find(e => e.date === date) || null
  }

  async getYesterdayDiary(): Promise<DiaryEntry | null> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return this.getDiaryByDate(this.getDateStr(yesterday))
  }

  async getDiariesInRange(startDate: string, endDate: string): Promise<DiaryEntry[]> {
    const entries = this.getAllEntries()
    return entries.filter(e => e.date >= startDate && e.date <= endDate)
  }

  async searchDiaries(keyword: string): Promise<DiaryEntry[]> {
    const entries = this.getAllEntries()
    const lowerKeyword = keyword.toLowerCase()
    return entries.filter(e =>
      e.content.toLowerCase().includes(lowerKeyword) ||
      e.mood?.toLowerCase().includes(lowerKeyword) ||
      e.weather?.toLowerCase().includes(lowerKeyword)
    )
  }

  getAllEntries(): DiaryEntry[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private saveAllEntries(entries: DiaryEntry[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(entries))
  }

  async generateDiaryFromConversation(conversation: string): Promise<DiaryEntry> {
    const dateStr = this.getDateStr()
    const llmConfig = appState.llm

    const prompt = `你是一个日记助手。根据下面的对话内容，生成今天的日记条目。

对话内容：
${conversation}

请以JSON格式返回，包含以下字段：
- date: 日期（格式：YYYY-MM-DD）
- weather: 天气情况（从对话中推断或留空）
- mood: 心情（从对话中推断或留空）
- content: 日记正文内容（基于对话内容生成，不要包含对话记录，而是总结成日记形式）
- summary: 今日摘要（一句话总结今天发生的重要事情）

只返回JSON，不要有其他内容。`

    try {
      const response = await getLLMResponse({
        provider: 'openai',
        model: llmConfig.model,
        apiKey: llmConfig.apiKey
      }, prompt)

      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const diaryData = JSON.parse(cleanedResponse)

      return {
        date: dateStr,
        weather: diaryData.weather || '',
        mood: diaryData.mood || '',
        content: diaryData.content || '',
        summary: diaryData.summary || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('生成日记失败:', error)
      return {
        date: dateStr,
        content: conversation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  async generateRecallResponse(query: string, diaryEntries: DiaryEntry[] = []): Promise<string> {
    const entries = diaryEntries.length > 0 ? diaryEntries : this.getAllEntries()

    if (entries.length === 0) {
      return '目前还没有日记记录，无法为您回忆过去的事情。'
    }

    const llmConfig = appState.llm
    const diaryContext = entries.map(e =>
      `[${e.date}] 天气: ${e.weather || '未记录'}, 心情: ${e.mood || '未记录'}\n摘要: ${e.summary || '无'}\n内容: ${e.content.substring(0, 200)}...`
    ).join('\n\n')

    const prompt = `你是一个回忆助手。用户询问："${query}"

以下是用户的所有日记记录：
${diaryContext}

请根据日记内容，回答用户的问题。如果日记中没有相关信息，请说明暂时没有记录。用友好的语气回答。`

    try {
      return await getLLMResponse({
        provider: 'openai',
        model: llmConfig.model,
        apiKey: llmConfig.apiKey
      }, prompt)
    } catch (error) {
      console.error('生成回忆回复失败:', error)
      return '抱歉，读取日记时出现了问题。'
    }
  }

  deleteEntry(date: string): void {
    const entries = this.getAllEntries()
    const filtered = entries.filter(e => e.date !== date)
    this.saveAllEntries(filtered)
  }

  exportAllDiaries(): DiaryEntry[] {
    return this.getAllEntries()
  }
}

export const diaryService = new DiaryService()
