import { ChatMessageSchema } from '../schemas';
import { createOpenAIModel, generateChatResponse } from '../services/ai-service';

export default defineEventHandler(async (event) => {
  const { success, data } = await readValidatedBody(event, ChatMessageSchema.safeParse);

  if (!success) {
    return 400;
  }

  const { messages } = data as {
    messages: ChatMessage[];
    chatId: string;
  };

  const openaiApiKey = useRuntimeConfig().openaiApiKey;
  const openaiModel = createOpenAIModel(openaiApiKey);

  const response = await generateChatResponse(openaiModel, messages);

  return {
    id: messages.length.toString(),
    role: 'assistant',
    content: response,
  };
});
