import { defineStore } from 'pinia'
import { ref } from 'vue'
import { streamAIAnalysis } from '@/services/aiService'

export const useAIStore = defineStore('ai', () => {
  const response      = ref('')
  const streaming     = ref(false)
  const error         = ref(null)
  const provider      = ref('athena')
  const model         = ref('claude-sonnet-4-6')
  const lastProvider  = ref('')
  const lastModel     = ref('')

  const providers = {
    anthropic: { models: ['claude-sonnet-4-6', 'claude-opus-4-5', 'claude-haiku-3-5'] },
    openai:    { models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
    gemini:    { models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
    athena:    { models: ['claude-sonnet-4-6', 'gpt-4o', 'gemini-1.5-pro'] },
  }

  async function analyzeConflict(context) {
    response.value     = ''
    streaming.value    = true
    error.value        = null
    lastProvider.value = provider.value
    lastModel.value    = model.value
    try {
      await streamAIAnalysis(context, provider.value, model.value, (chunk) => {
        response.value += chunk
      })
    } catch (err) {
      error.value = err.message
    } finally {
      streaming.value = false
    }
  }

  function setProvider(p) {
    provider.value = p
    model.value    = providers[p]?.models[0] || 'claude-sonnet-4-6'
  }

  function clear() {
    response.value  = ''
    error.value     = null
    streaming.value = false
  }

  return {
    response, streaming, error, provider, model,
    lastProvider, lastModel, providers,
    analyzeConflict, setProvider, clear
  }
})
