import { getChatByIdForUser } from '#layers/chat/server/repository/chatRepository';

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);
  const userId = await getAuthenticatedUserId(event);

  const chat = await getChatByIdForUser(id, userId);

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found',
    });
  }

  return chat;
});
