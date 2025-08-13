import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';

const { useChatsMock } = vi.hoisted(() => {
  return {
    useChatsMock: vi.fn(() => {
      return {
        chats: ref<Chat[]>([]),
      };
    }),
  };
});

mockNuxtImport('useChats', () => {
  return useChatsMock;
});

const { useFetchMock } = vi.hoisted(() => {
  return {
    useFetchMock: vi.fn(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: vi.fn(async () => Promise.resolve()),
        status: ref('idle'),
      };
    }),
  };
});

mockNuxtImport('useFetch', () => {
  return useFetchMock;
});

const mockFetch = vi.spyOn(global, '$fetch');

describe('useChat', () => {
  const testId = 'test-uuid';

  beforeEach(() => {
    vi.clearAllMocks();

    useChatsMock.mockImplementation(() => ({
      chats: ref([
        {
          id: testId,
          title: 'Nuxt.js project help',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    }));

    useFetchMock.mockImplementation(() => {
      return {
        data: ref<ChatMessage[]>([
          {
            id: 'test-id2',
            content: 'Hello, can you help me with my Nuxt.js project?',
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'test-id3',
            content:
              "Of course! I'd be happy to help with your Nuxt.js project. What specific questions or issues do you have?",
            role: 'assistant',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        execute: vi.fn(async () => Promise.resolve()),
        status: ref('idle'),
      };
    });
  });

  it('initializes with correct chat data', () => {
    const { chat } = useChat(testId);

    expect(chat.value).toBeDefined();
    expect(chat.value?.id).toBe(testId);

    expect(useChatsMock).toHaveBeenCalledTimes(1);
  });

  it('fetches messages when fetchMessages is called', async () => {
    const { chat, fetchMessages } = useChat(testId);
    await fetchMessages();

    expect(useFetchMock).toHaveBeenCalledTimes(1);
    expect(useFetchMock).toHaveBeenCalledWith(
      `/api/chats/${testId}/messages`,
      expect.objectContaining({
        default: expect.any(Function),
        immediate: false,
      }),
      expect.any(String)
    );

    // should update chat.messages with fetched messages
    expect(chat.value?.messages).toHaveLength(2);
    expect(chat.value?.messages[0]?.id).toBe('test-id2');
    expect(chat.value?.messages[1]?.id).toBe('test-id3');
  });

  it('sendMessage posts user message and AI response, and generates title on first message', async () => {
    const userContent = 'Hi there';

    // 1st call: title generation
    mockFetch.mockResolvedValueOnce({
      id: testId,
      title: 'Generated Title',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Chat);
    // 2nd call: user message creation
    mockFetch.mockResolvedValueOnce({
      id: 'user-1',
      content: userContent,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatMessage);
    // 3rd call: ai response generation
    mockFetch.mockResolvedValueOnce({
      id: 'ai-1',
      content: 'Hello! How can I help you?',
      role: 'assistant',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatMessage);

    const { chat, messages, sendMessage } = useChat(testId);
    const prevUpdatedAt = chat.value?.updatedAt as Date;

    await sendMessage(userContent);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `/api/chats/${testId}/title`,
      expect.objectContaining({ method: 'POST', body: { message: userContent } })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `/api/chats/${testId}/messages`,
      expect.objectContaining({ method: 'POST', body: { content: userContent, role: 'user' } })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      `/api/chats/${testId}/messages/generate`,
      expect.objectContaining({ method: 'POST' })
    );

    // messages should contain user then ai message
    expect(messages.value).toHaveLength(2);
    expect(messages.value[0]?.id).toBe('user-1');
    expect(messages.value[0]?.role).toBe('user');
    expect(messages.value[1]?.id).toBe('ai-1');
    expect(messages.value[1]?.role).toBe('assistant');

    // title should be updated (since first message)
    expect(chat.value?.title).toBe('Generated Title');

    // updatedAt should change to a new Date
    expect(chat.value?.updatedAt).not.toBe(prevUpdatedAt);
  });

  it('sendMessage does not generate title when chat already has messages', async () => {
    // Pre-populate chat with a message
    useChatsMock.mockImplementationOnce(() => ({
      chats: ref([
        {
          id: testId,
          title: 'Existing Chat',
          messages: [
            {
              id: 'existing',
              content: 'Existing message',
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    }));

    // Only two calls: create user message and generate ai response
    mockFetch
      .mockResolvedValueOnce({
        id: 'user-2',
        content: 'Second message',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ChatMessage)
      .mockResolvedValueOnce({
        id: 'ai-2',
        content: 'AI reply',
        role: 'assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ChatMessage);

    const { chat, messages, sendMessage } = useChat(testId);
    await sendMessage('Second message');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `/api/chats/${testId}/messages`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `/api/chats/${testId}/messages/generate`,
      expect.objectContaining({ method: 'POST' })
    );
    // Title should remain unchanged
    expect(chat.value?.title).toBe('Existing Chat');
    expect(messages.value.map((m) => m.id)).toContain('user-2');
    expect(messages.value.map((m) => m.id)).toContain('ai-2');
  });

  it('sendMessage is a no-op when chat is not found', async () => {
    const missingId = 'missing';
    const { sendMessage } = useChat(missingId);
    await sendMessage('hello');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetchMessages is a no-op when status is not idle', async () => {
    // override useFetchMock for this test only with a spy-able execute
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('pending'),
      };
    });

    const { fetchMessages } = useChat(testId);
    await fetchMessages();
    // execute should not be called and $fetch untouched
    expect(useFetchMock).toHaveBeenCalled();
    expect(execSpy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetchMessages is a no-op when chat is not found', async () => {
    const execSpy = vi.fn(async () => Promise.resolve());
    // even if useChat is called, it sets up useFetch, but fetchMessages should early-return
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    const missingId = 'missing';
    const { fetchMessages } = useChat(missingId);
    await fetchMessages();
    expect(useFetchMock).toHaveBeenCalledTimes(1);
    expect(execSpy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
