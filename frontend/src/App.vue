<template>
  <div class="app-shell">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store = useConflictsStore()
onMounted(() => store.loadAllData())
</script>

<style>
.app-shell {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0e1a;
}
</style>
