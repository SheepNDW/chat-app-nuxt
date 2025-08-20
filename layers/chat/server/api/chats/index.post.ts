import { createChat } from '../../repository/chatRepository';
import { CreateChatSchema } from '#layers/chat/server/schemas';

export default defineEventHandler(async (event) => {
  const { success, data } = await readValidatedBody(event, CreateChatSchema.safeParse);

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
    });
  }

  const { title, projectId } = data;

  const storage = useStorage('db');
  await storage.setItem('chats:has-new-chat', true);

  return createChat({
    title,
    projectId,
  });
});
