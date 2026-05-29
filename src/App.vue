<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
onMounted(() => store.fetchAll());
</script>

<style>
#app-root { width: 100vw; height: 100vh; overflow: hidden; background: #050a14; }
</style>
