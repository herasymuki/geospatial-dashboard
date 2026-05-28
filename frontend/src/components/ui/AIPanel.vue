<template>
  <div class="ai-panel panel">
    <div class="panel-header">
      <span>✦</span> AI INTELLIGENCE
      <div class="ai-controls ml-auto">
        <select v-model="aiStore.provider" @change="aiStore.setProvider(aiStore.provider)" class="ai-select">
          <option v-for="(_, p) in aiStore.providers" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="aiStore.model" class="ai-select">
          <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
        </select>
        <button v-if="aiStore.response" class="clear-ai-btn" @click="aiStore.clear()" title="Clear">✕</button>
      </div>
    </div>

    <div class="ai-body" ref="bodyRef">
      <div v-if="!aiStore.response && !aiStore.streaming && !aiStore.error" class="ai-empty">
        <div class="ai-empty-icon">✦</div>
        <p>Select a conflict event and click <strong>AI Intelligence Brief</strong> for an analysis.</p>
        <div class="ai-capabilities">
          <span>Situation Assessment</span>
          <span>Actor Profiles</span>
          <span>Regional Impact</span>
          <span>Trend Analysis</span>
        </div>
      </div>

      <div v-if="aiStore.error" class="ai-error">
        <span>⚠</span> {{ aiStore.error }}
      </div>

      <div v-if="aiStore.response || aiStore.streaming" class="ai-response">
        <div class="ai-meta" v-if="aiStore.lastProvider">
          <span class="ai-badge">{{ aiStore.lastProvider }}</span>
          <span class="ai-badge">{{ aiStore.lastModel }}</span>
        </div>
        <div class="ai-content" v-html="renderedResponse"></div>
        <div v-if="aiStore.streaming" class="ai-cursor">▌</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { marked } from 'marked'
import { useAIStore } from '@/stores/ai'

const aiStore  = useAIStore()
const bodyRef  = ref(null)

const currentModels = computed(() => aiStore.providers[aiStore.provider]?.models || [])

const renderedResponse = computed(() => {
  if (!aiStore.response) return ''
  return marked.parse(aiStore.response)
})

// Auto-scroll as streaming arrives
watch(() => aiStore.response, async () => {
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
})
</script>

<style scoped>
.ai-panel {
  height: 260px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-right: none;
  border-left: none;
  border-bottom: none;
}
.ai-controls { display: flex; align-items: center; gap: 4px; }
.ai-select {
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 3px;
  color: #94a3b8;
  font-size: 9px;
  padding: 2px 4px;
  outline: none;
  cursor: pointer;
  max-width: 110px;
}
.clear-ai-btn {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 10px;
  padding: 0 2px;
}
.clear-ai-btn:hover { color: #ef4444; }

.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
}
.ai-empty-icon { font-size: 20px; color: #1e2d45; }
.ai-empty p { font-size: 11px; color: #475569; line-height: 1.5; text-align: center; }
.ai-empty strong { color: #64748b; }
.ai-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.ai-capabilities span {
  font-size: 9px;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  color: #3b82f6;
}

.ai-error { font-size: 11px; color: #ef4444; display: flex; gap: 6px; align-items: flex-start; }

.ai-response {}
.ai-meta { display: flex; gap: 4px; margin-bottom: 8px; }
.ai-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.2);
  color: #3b82f6;
}

.ai-content {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.65;
}
.ai-content :deep(h1),
.ai-content :deep(h2),
.ai-content :deep(h3) {
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  margin: 10px 0 4px;
}
.ai-content :deep(p)      { margin-bottom: 6px; }
.ai-content :deep(ul)     { padding-left: 16px; margin-bottom: 6px; }
.ai-content :deep(li)     { margin-bottom: 3px; }
.ai-content :deep(strong) { color: #e2e8f0; }
.ai-content :deep(em)     { color: #64748b; }
.ai-content :deep(code)   { font-family: 'JetBrains Mono', monospace; font-size: 10px; background: #1a2235; padding: 1px 4px; border-radius: 2px; }

.ai-cursor {
  display: inline-block;
  animation: blink 0.65s infinite;
  color: #3b82f6;
  font-size: 13px;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
