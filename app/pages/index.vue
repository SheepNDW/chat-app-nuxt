<script setup lang="ts">
const appConfig = useAppConfig();

const { createChat } = useChats();
function handleClickChat() {
  createChat();
}
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center h-screen">
    <span class="text-2xl font-bold mb-2">
      {{ appConfig.title }}
    </span>
    <UButton to="/chat" @click="handleClickChat">Start Chat</UButton>
  </UContainer>
</template>
