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

// Mock streaming APIs
const mockReader = {
  read: vi.fn(),
};

const mockStream = {
  pipeThrough: vi.fn(() => ({
    getReader: vi.fn(() => mockReader),
  })),
};

global.ReadableStream = vi.fn(() => mockStream) as unknown as typeof ReadableStream;
global.TextDecoderStream = vi.fn() as unknown as typeof TextDecoderStream;

describe('useChat', () => {
  const testId = 'test-uuid';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset streaming mocks
    mockReader.read.mockReset();
    mockStream.pipeThrough.mockReturnValue({
      getReader: vi.fn(() => mockReader),
    });

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

  it('fetchMessages with refresh=true ignores existing messages', async () => {
    const { chat, fetchMessages } = useChat(testId);

    // Pre-populate with messages
    if (chat.value) {
      chat.value.messages = [
        {
          id: 'existing',
          content: 'Existing message',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    await fetchMessages({ refresh: true });

    expect(useFetchMock).toHaveBeenCalledTimes(1);
    // should still update messages despite existing ones
    expect(chat.value?.messages).toHaveLength(2);
  });

  it('fetchMessages skips when hasExistingMessages and refresh=false', async () => {
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    const { chat, fetchMessages } = useChat(testId);

    // Pre-populate with multiple messages
    if (chat.value) {
      chat.value.messages = [
        {
          id: 'msg1',
          content: 'First message',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'msg2',
          content: 'Second message',
          role: 'assistant',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    await fetchMessages(); // refresh defaults to false

    expect(execSpy).not.toHaveBeenCalled();
  });

  it('sendMessage adds optimistic message, streams response, and generates title on first message', async () => {
    const userContent = 'Hi there';

    // Mock streaming response
    mockReader.read
      .mockResolvedValueOnce({ value: 'Hello! ', done: false })
      .mockResolvedValueOnce({ value: 'How can I help you?', done: false })
      .mockResolvedValueOnce({ value: undefined, done: true });

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
    // 3rd call: streaming response
    mockFetch.mockResolvedValueOnce(mockStream);
    // 4th call: fetchMessages refresh
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([
          {
            id: 'user-1',
            content: userContent,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'ai-1',
            content: 'Hello! How can I help you?',
            role: 'assistant',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    const { chat, sendMessage } = useChat(testId);
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
      `/api/chats/${testId}/messages/stream`,
      expect.objectContaining({ method: 'POST', responseType: 'stream' })
    );

    // fetchMessages should be called with refresh: true
    expect(execSpy).toHaveBeenCalledTimes(1);

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

    // Mock streaming response
    mockReader.read
      .mockResolvedValueOnce({ value: 'AI reply', done: false })
      .mockResolvedValueOnce({ value: undefined, done: true });

    // Only two calls: create user message and streaming response
    mockFetch
      .mockResolvedValueOnce({
        id: 'user-2',
        content: 'Second message',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ChatMessage)
      .mockResolvedValueOnce(mockStream);

    // Mock fetchMessages refresh
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    const { chat, sendMessage } = useChat(testId);
    await sendMessage('Second message');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `/api/chats/${testId}/messages`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `/api/chats/${testId}/messages/stream`,
      expect.objectContaining({ method: 'POST', responseType: 'stream' })
    );

    // Title should remain unchanged
    expect(chat.value?.title).toBe('Existing Chat');
    expect(execSpy).toHaveBeenCalledTimes(1);
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

  it('sendMessage handles user message creation error by removing optimistic message', async () => {
    // First call will be for title generation (since it's first message)
    mockFetch.mockResolvedValueOnce({
      id: testId,
      title: 'Generated Title',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Chat);

    // Second call will fail for user message creation
    const messageCreationError = new Error('Failed to create message');
    mockFetch.mockRejectedValueOnce(messageCreationError);

    const { messages, sendMessage } = useChat(testId);

    // The function should not throw, but handle the error internally
    await expect(sendMessage('Test message')).resolves.toBeUndefined();

    // Should not have any messages after error (optimistic message removed)
    expect(messages.value).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('sendMessage handles streaming error gracefully', async () => {
    // Pre-populate chat with a message so no title generation
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

    // User message creation succeeds
    mockFetch.mockResolvedValueOnce({
      id: 'user-1',
      content: 'Test message',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatMessage);

    // Streaming fails
    const streamingError = new Error('Streaming failed');
    mockFetch.mockRejectedValueOnce(streamingError);

    // Mock fetchMessages refresh
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    const { sendMessage } = useChat(testId);

    // The function should not throw, but handle the error internally
    await expect(sendMessage('Test message')).resolves.toBeUndefined();

    // Should still call fetchMessages even after streaming error
    expect(execSpy).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('sendMessage handles title generation error gracefully', async () => {
    const titleError = new Error('Title generation failed');
    mockFetch.mockRejectedValueOnce(titleError);

    // Mock user message creation to succeed
    mockFetch.mockResolvedValueOnce({
      id: 'user-1',
      content: 'Test message',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatMessage);

    // Mock streaming response
    mockReader.read
      .mockResolvedValueOnce({ value: 'AI reply', done: false })
      .mockResolvedValueOnce({ value: undefined, done: true });
    mockFetch.mockResolvedValueOnce(mockStream);

    // Mock fetchMessages refresh
    const execSpy = vi.fn(async () => Promise.resolve());
    useFetchMock.mockImplementationOnce(() => {
      return {
        data: ref<ChatMessage[]>([]),
        execute: execSpy,
        status: ref('idle'),
      };
    });

    // Mock console.error to verify error logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendMessage, chat } = useChat(testId);

    // Since generateChatTitle now has error handling,
    // and is awaited in sendMessage, the error should be handled gracefully
    await expect(sendMessage('Test message')).resolves.toBeUndefined();

    // Should have logged the error
    expect(consoleSpy).toHaveBeenCalledWith('Error generating chat title:', titleError);

    // Title should remain unchanged after error
    expect(chat.value?.title).toBe('Nuxt.js project help');

    // Message sending should still succeed
    expect(execSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
