<template>
  <div class="ai-panel panel">
    <div class="panel-header">
      <span>✦</span> AI ANALYSIS
      <div class="ai-controls ml-auto">
        <select v-model="aiStore.provider" @change="aiStore.setProvider(aiStore.provider)" class="ai-select">
          <option v-for="(_, p) in aiStore.providers" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="aiStore.model" class="ai-select">
          <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </div>

    <div class="ai-body">
      <div v-if="!aiStore.response && !aiStore.streaming" class="ai-empty">
        <p>Select an event and click <strong>AI Analysis</strong> to get an intelligence summary.</p>
      </div>

      <div v-if="aiStore.error" class="ai-error">⚠ {{ aiStore.error }}</div>

      <div v-if="aiStore.response || aiStore.streaming" class="ai-response">
        <div class="ai-content" v-html="renderedResponse"></div>
        <div v-if="aiStore.streaming" class="ai-cursor">▌</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import { useAIStore } from '@/stores/ai'

const aiStore = useAIStore()

const currentModels = computed(() => aiStore.providers[aiStore.provider]?.models || [])

const renderedResponse = computed(() => {
  if (!aiStore.response) return ''
  return marked.parse(aiStore.response)
})
</script>

<style scoped>
.ai-panel {
  height: 280px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-right: none;
  border-left: none;
  border-bottom: none;
}
.ai-controls { display: flex; gap: 4px; }
.ai-select {
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 3px;
  color: #94a3b8;
  font-size: 9px;
  padding: 2px 4px;
  outline: none;
  cursor: pointer;
}
.ai-body { flex: 1; overflow-y: auto; padding: 10px 12px; }
.ai-empty { font-size: 11px; color: #475569; line-height: 1.5; }
.ai-error { font-size: 11px; color: #ef4444; }
.ai-response { font-size: 11px; color: #94a3b8; line-height: 1.6; }
.ai-content :deep(h1), .ai-content :deep(h2), .ai-content :deep(h3) {
  color: #e2e8f0; font-size: 12px; font-weight: 600; margin: 8px 0 4px;
}
.ai-content :deep(p)  { margin-bottom: 6px; }
.ai-content :deep(ul) { padding-left: 16px; }
.ai-content :deep(strong) { color: #e2e8f0; }
.ai-cursor { display: inline-block; animation: blink 0.7s infinite; color: #3b82f6; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
</style>
