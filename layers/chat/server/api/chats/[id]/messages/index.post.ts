import { createMessageForChat } from '#layers/chat/server/repository/chatRepository';
import { CreateMessageSchema } from '#layers/chat/server/schemas';

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  const { success, data } = await readValidatedBody(event, CreateMessageSchema.safeParse);

  if (!success) {
    return 400;
  }

  const { content, role } = data;

  return createMessageForChat({
    chatId: id,
    content,
    role,
  });
});
