import { ref } from 'vue'
import type { AsrConfig, AsrCallbacks } from '../types'
import { ASR_CONFIG, APP_CONFIG } from '../constants'
import { signCallback } from '../lib/asr'

export function useAsr(config: AsrConfig) {
  const asrText = ref('')
  const isListening = ref(false)
  let webAudioSpeechRecognizer: any = null

  const buildAsrConfig = (vadSilenceTime?: number) => ({
    signCallback: signCallback.bind(null, config.secretKey),
    appid: config.appId,
    secretid: config.secretId,
    secretkey: config.secretKey,
    engine_model_type: ASR_CONFIG.ENGINE_MODEL_TYPE,
    voice_format: ASR_CONFIG.VOICE_FORMAT,
    filter_dirty: ASR_CONFIG.FILTER_DIRTY,
    filter_modal: ASR_CONFIG.FILTER_MODAL,
    filter_punc: ASR_CONFIG.FILTER_PUNC,
    convert_num_mode: ASR_CONFIG.CONVERT_NUM_MODE,
    word_info: ASR_CONFIG.WORD_INFO,
    needvad: ASR_CONFIG.NEEDVAD,
    vad_silence_time: vadSilenceTime || config.vadSilenceTime || APP_CONFIG.DEFAULT_VAD_SILENCE_TIME
  })

  const start = (callbacks: AsrCallbacks, vadSilenceTime?: number) => {
    if (isListening.value) {
      console.warn('语音识别已在进行中')
      return
    }

    if (!window.WebAudioSpeechRecognizer) {
      console.error('WebAudioSpeechRecognizer 未加载')
      callbacks.onError('WebAudioSpeechRecognizer 未加载')
      return
    }

    if (!config.appId || !config.secretId || !config.secretKey) {
      console.error('ASR配置不完整')
      callbacks.onError('ASR配置不完整')
      return
    }

    const asrConfig = buildAsrConfig(vadSilenceTime)
    console.log('ASR配置:', asrConfig)

    try {
      webAudioSpeechRecognizer = new window.WebAudioSpeechRecognizer(asrConfig)

      webAudioSpeechRecognizer.OnRecognitionStart = (res: any) => {
        console.log('识别开始:', res)
      }

      webAudioSpeechRecognizer.OnSentenceBegin = (res: any) => {
        console.log('句子开始:', res)
        asrText.value = ''
      }

      webAudioSpeechRecognizer.OnRecognitionResultChange = (res: any) => {
        const currentText = res.result?.voice_text_str
        if (currentText) {
          asrText.value = currentText
          console.log('识别中:', currentText)
        }
      }

      webAudioSpeechRecognizer.OnSentenceEnd = (res: any) => {
        const resultText = res.result?.voice_text_str
        console.log('句子结束:', resultText)
        if (resultText) {
          asrText.value = resultText
          callbacks.onFinished(resultText)
        }
      }

      webAudioSpeechRecognizer.OnRecognitionComplete = (res: any) => {
        console.log('识别完成:', res)
        isListening.value = false
      }

      webAudioSpeechRecognizer.OnError = (res: any) => {
        console.error('识别错误:', res)
        isListening.value = false
        callbacks.onError(res)
      }

      webAudioSpeechRecognizer.start()
      isListening.value = true
      console.log('开始语音识别')
    } catch (error) {
      console.error('创建WebAudioSpeechRecognizer失败:', error)
      callbacks.onError(error)
    }
  }

  const stop = () => {
    if (webAudioSpeechRecognizer) {
      webAudioSpeechRecognizer.stop()
      webAudioSpeechRecognizer = null
    }
    isListening.value = false
    console.log('停止语音识别')
  }

  return {
    asrText,
    isListening,
    start,
    stop
  }
}