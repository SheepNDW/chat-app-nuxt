import type { Message, ChatWithMessages } from '#layers/chat/shared/types/types';

// Base mock data creators
export const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'test-id',
  content: 'Test message',
  role: 'user',
  chatId: 'test-uuid',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockChat = (overrides: Partial<ChatWithMessages> = {}): ChatWithMessages => ({
  id: 'test-uuid',
  title: 'Nuxt.js project help',
  userId: 'test-user-1',
  projectId: null,
  messages: [],
  project: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const getDefaultTestMessages = (chatId: string = 'test-uuid'): Message[] => [
  createMockMessage({
    id: 'test-id2',
    content: 'Hello, can you help me with my Nuxt.js project?',
    role: 'user',
    chatId,
  }),
  createMockMessage({
    id: 'test-id3',
    content:
      "Of course! I'd be happy to help with your Nuxt.js project. What specific questions or issues do you have?",
    role: 'assistant',
    chatId,
  }),
];
