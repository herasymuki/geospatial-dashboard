<template>
  <div class="ai-panel panel">
    <div class="panel-header">
      <i class="fa-solid fa-microchip"></i> AI INTELLIGENCE
      <div class="ai-controls ml-auto">
        <select v-model="aiStore.provider" @change="aiStore.setProvider(aiStore.provider)" class="ai-select">
          <option v-for="(_, p) in aiStore.providers" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="aiStore.model" class="ai-select">
          <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
        </select>
        <button v-if="aiStore.response" class="clear-ai-btn" @click="aiStore.clear()" title="Clear">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <div class="ai-body" ref="bodyRef">
      <div v-if="!aiStore.response && !aiStore.streaming && !aiStore.error" class="ai-empty">
        <i class="fa-solid fa-microchip ai-empty-icon"></i>
        <p>Select a conflict event and click <strong>AI Intelligence Brief</strong> for an analysis.</p>
        <div class="ai-capabilities">
          <span>Situation Assessment</span>
          <span>Actor Profiles</span>
          <span>Regional Impact</span>
          <span>Trend Analysis</span>
        </div>
      </div>

      <div v-if="aiStore.error" class="ai-error">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ aiStore.error }}
      </div>

      <div v-if="aiStore.response || aiStore.streaming" class="ai-response">
        <div class="ai-meta" v-if="aiStore.lastProvider">
          <span class="ai-badge">{{ aiStore.lastProvider }}</span>
          <span class="ai-badge">{{ aiStore.lastModel }}</span>
        </div>
        <div class="ai-content" v-html="renderedResponse"></div>
        <div v-if="aiStore.streaming" class="ai-cursor">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
        </div>
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
.panel-header {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #475569;
  text-transform: uppercase;
  border-bottom: 1px solid #1e2d45;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ml-auto { margin-left: auto; }
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
  display: flex;
  align-items: center;
}
.clear-ai-btn:hover { color: #ef4444; }

.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  min-height: 0;
}
.ai-body::-webkit-scrollbar { width: 3px; }
.ai-body::-webkit-scrollbar-thumb { background: #1e2d45; }

.ai-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}
.ai-empty-icon { font-size: 22px; opacity: 0.25; color: #3b82f6; }
.ai-empty p { font-size: 10px; color: #334155; }
.ai-empty strong { color: #475569; }
.ai-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-top: 4px;
}
.ai-capabilities span {
  font-size: 8px;
  padding: 2px 6px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.15);
  border-radius: 3px;
  color: #3b82f6;
}

.ai-error {
  padding: 8px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 4px;
  font-size: 10px;
  color: #f87171;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-response {}
.ai-meta {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.ai-badge {
  font-size: 8px;
  padding: 1px 5px;
  background: rgba(168,85,247,0.12);
  border: 1px solid rgba(168,85,247,0.2);
  border-radius: 3px;
  color: #c084fc;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.ai-content {
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.6;
}
.ai-content :deep(h1),
.ai-content :deep(h2),
.ai-content :deep(h3) {
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 700;
  margin: 8px 0 4px;
}
.ai-content :deep(strong) { color: #cbd5e1; }
.ai-content :deep(p)      { margin: 4px 0; }
.ai-content :deep(ul),
.ai-content :deep(ol)     { padding-left: 14px; margin: 4px 0; }
.ai-content :deep(li)     { margin: 2px 0; }
.ai-content :deep(code)   {
  background: #111827;
  border-radius: 2px;
  padding: 1px 4px;
  font-size: 9px;
  color: #60a5fa;
}

.ai-cursor {
  display: inline-flex;
  align-items: center;
  color: #3b82f6;
  font-size: 11px;
  margin-top: 4px;
}
</style>
