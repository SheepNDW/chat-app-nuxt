export default function useChat(chatId: string) {
  const { chats } = useChats();
  const chat = computed(() => chats.value.find((c) => c.id === chatId));

  const messages = computed<ChatMessage[]>(() => chat.value?.messages || []);

  const { data, execute, status } = useFetch<ChatMessage[]>(`/api/chats/${chatId}/messages`, {
    default: () => [],
    immediate: false,
  });

  async function fetchMessages({ refresh = false }: { refresh?: boolean } = {}) {
    const hasExistingMessages = messages.value.length > 1;
    const isRequestInProgress = status.value !== 'idle';
    const shouldSkipDueToExistingState = !refresh && (hasExistingMessages || isRequestInProgress);

    if (shouldSkipDueToExistingState || !chat.value) return;

    await execute();
    chat.value.messages = data.value;
  }

  async function generateChatTitle(message: string) {
    if (!chat.value) return;

    try {
      const updatedChat = await $fetch<Chat>(`/api/chats/${chatId}/title`, {
        method: 'POST',
        body: { message },
      });

      chat.value.title = updatedChat.title;
    } catch (error) {
      console.error('Error generating chat title:', error);
    }
  }

  async function sendMessage(message: string) {
    if (!chat.value) return;

    if (messages.value.length === 0) {
      await generateChatTitle(message);
    }

    const optimisticUserMessage: ChatMessage = {
      id: `optimistic-message-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    messages.value.push(optimisticUserMessage);
    const userMessageIndex = messages.value.length - 1;

    try {
      const newMessage = await $fetch<ChatMessage>(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        body: {
          content: message,
          role: 'user',
        },
      });

      messages.value[userMessageIndex] = newMessage;
    } catch (error) {
      console.error('Error sending chat message:', error);
      messages.value.splice(userMessageIndex, 1); // Remove optimistic message on error
      return;
    }

    messages.value.push({
      id: `streaming-message-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const lastMessage = messages.value[messages.value.length - 1] as ChatMessage;

    try {
      const response = await $fetch<ReadableStream>(`/api/chats/${chatId}/messages/stream`, {
        method: 'POST',
        responseType: 'stream',
        body: {
          messages: messages.value,
        },
      });

      const reader = response.pipeThrough(new TextDecoderStream()).getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lastMessage.content += value ?? '';
      }
    } catch (error) {
      console.error('Error streaming chat response:', error);
    } finally {
      await fetchMessages({ refresh: true });
    }

    chat.value.updatedAt = new Date();
  }

  return {
    chat,
    messages,
    sendMessage,
    fetchMessages,
  };
}
