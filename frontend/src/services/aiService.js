import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 120000 })

export async function streamAIAnalysis(context, provider, model, onChunk) {
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, provider, model })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.detail || 'AI request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    // SSE format: "data: <chunk>\n\n"
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const chunk = line.slice(6)
        if (chunk !== '[DONE]') onChunk(chunk)
      }
    }
  }
}
