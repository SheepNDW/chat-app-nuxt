import { getChatById } from '~~/layers/chat/server/repository/chatRepository';

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);
  return getChatById(id);
});
