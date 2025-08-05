import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '~/types';
import useChat from '../useChat';

// Mock $fetch
const mockResponse = {
  id: '3',
  role: 'assistant',
  content: 'Mock response from API',
};
const mockFetch = vi.fn(() => {
  return Promise.resolve(mockResponse);
});
vi.stubGlobal('$fetch', mockFetch);

describe('useChat', () => {
  let testChatId: string;

  beforeEach(() => {
    mockFetch.mockClear();

    // Create a test chat using useChats
    const { createChat } = useChats();
    const testChat = createChat();
    testChatId = testChat.id;

    // Add initial messages to the test chat
    (testChat.messages as ChatMessage[]).push(
      {
        id: '0',
        role: 'user' as const,
        content: 'Hello',
      },
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Hi there!',
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with chat data for given chatId', () => {
    const { chat, messages } = useChat(testChatId);

    expect(chat.value?.id).toBe(testChatId);
    expect(chat.value?.title).toBe(`Chat ${testChatId}`);
    expect(messages.value).toHaveLength(2);
    expect(messages.value[0]?.content).toBe('Hello');
    expect(messages.value[1]?.content).toBe('Hi there!');
  });

  it('should return undefined chat for non-existent chatId', () => {
    const { chat, messages } = useChat('non-existent');

    expect(chat.value).toBeUndefined();
    expect(messages.value).toHaveLength(0);
  });

  it('should have reactive messages computed from chat', () => {
    const { chat, messages } = useChat(testChatId);

    // Initially 2 messages
    expect(messages.value).toHaveLength(2);

    // Add a message directly to chat
    chat.value!.messages.push({
      id: '2',
      role: 'user' as const,
      content: 'New message',
    });

    // Messages should be reactive
    expect(messages.value).toHaveLength(3);
    expect(messages.value[2]?.content).toBe('New message');
  });

  it('should send a user message and receive an assistant response', async () => {
    const { messages, sendMessage } = useChat(testChatId);

    const initialMessageCount = messages.value.length;
    const testMessage = 'Test message';

    await sendMessage(testMessage);

    // User message should be added
    expect(messages.value).toHaveLength(initialMessageCount + 2);
    expect(messages.value[initialMessageCount]).toEqual({
      id: initialMessageCount.toString(),
      role: 'user',
      content: testMessage,
    });

    // Assistant response should be added
    expect(messages.value[initialMessageCount + 1]).toEqual(mockResponse);
  });

  it('should generate sequential IDs for messages', async () => {
    const { messages, sendMessage } = useChat(testChatId);

    const initialCount = messages.value.length;

    // Mock responses for each call
    mockFetch
      .mockResolvedValueOnce({
        id: (initialCount + 1).toString(),
        role: 'assistant',
        content: 'Response 1',
      })
      .mockResolvedValueOnce({
        id: (initialCount + 3).toString(),
        role: 'assistant',
        content: 'Response 2',
      });

    await sendMessage('First message');
    await sendMessage('Second message');

    // Check that user message IDs are sequential
    expect(messages.value[initialCount]?.id).toBe(initialCount.toString());
    expect(messages.value[initialCount + 2]?.id).toBe((initialCount + 2).toString());
  });

  it('should handle API errors gracefully', async () => {
    const { messages, sendMessage } = useChat(testChatId);

    const initialMessageCount = messages.value.length;
    const testMessage = 'Test message';

    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    await expect(sendMessage(testMessage)).rejects.toThrow('API Error');

    // User message should still be added even if API fails
    expect(messages.value).toHaveLength(initialMessageCount + 1);
    expect(messages.value[initialMessageCount]).toEqual({
      id: initialMessageCount.toString(),
      role: 'user',
      content: testMessage,
    });
  });

  it('should send all current messages to API', async () => {
    const { messages, sendMessage } = useChat(testChatId);

    const initialMessages = [...messages.value]; // Capture initial state
    const newMessage = 'New message';

    // Mock the fetch to capture what was sent, before the response modifies the array
    let sentMessages: ChatMessage[] = [];
    mockFetch.mockImplementationOnce(() => {
      // Capture the current state of messages at the time of API call
      sentMessages = [...messages.value];
      return Promise.resolve(mockResponse);
    });

    await sendMessage(newMessage);

    // Verify that all messages (including the new user message) were sent to API
    const expectedMessages = [
      ...initialMessages,
      {
        id: initialMessages.length.toString(),
        role: 'user',
        content: newMessage,
      },
    ];

    expect(sentMessages).toEqual(expectedMessages);
  });

  it('should not send message if chat does not exist', async () => {
    const { sendMessage } = useChat('non-existent');

    await sendMessage('Test message');

    // $fetch should not be called if chat doesn't exist
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
