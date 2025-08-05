<script setup lang="ts">
const appConfig = useAppConfig();

const { createChatAndNavigate } = useChats();

async function handleClickChat() {
  await createChatAndNavigate();
}
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center h-screen">
    <span class="text-2xl font-bold mb-2">
      {{ appConfig.title }}
    </span>
    <UButton class="mt-2" @click="handleClickChat">Start Chat</UButton>
  </UContainer>
</template>
