import {
  createMessageForChat,
  getChatByIdForUser,
  getMessagesByChatId,
} from '~~/layers/chat/server/repository/chatRepository';
import { createOpenAIModel, generateChatResponse } from '~~/layers/chat/server/services/ai-service';

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);
  const userId = await getAuthenticatedUserId(event);

  // Verify user owns the chat
  const chat = await getChatByIdForUser(id, userId);
  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found',
    });
  }

  const history = await getMessagesByChatId(id);

  const openai = createOpenAIModel(useRuntimeConfig().openaiApiKey);
  const reply = await generateChatResponse(openai, history);

  return createMessageForChat({
    chatId: id,
    content: reply,
    role: 'assistant',
  });
});
