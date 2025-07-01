import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useChat from '../useChat';

// Mock the mockData module
vi.mock('../mockData', () => ({
  MOCK_CHAT: {
    id: '1',
    title: 'Test Chat',
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
      },
    ],
  },
}));

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
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with mock chat data', () => {
    const { chat, messages } = useChat();

    expect(chat.value.id).toBe('1');
    expect(chat.value.title).toBe('Test Chat');
    expect(messages.value).toHaveLength(2);
    expect(messages.value[0]?.content).toBe('Hello');
    expect(messages.value[1]?.content).toBe('Hi there!');
  });

  it('should have reactive messages computed from chat', () => {
    const { chat, messages } = useChat();

    // Initially 2 messages
    expect(messages.value).toHaveLength(2);

    // Add a message directly to chat
    chat.value.messages.push({
      id: '3',
      role: 'user',
      content: 'New message',
    });

    // Messages should be reactive
    expect(messages.value).toHaveLength(3);
    expect(messages.value[2]?.content).toBe('New message');
  });

  it('should send a user message and receive an assistant response', async () => {
    const { messages, sendMessage } = useChat();

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
    const { messages, sendMessage } = useChat();

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
    const { messages, sendMessage } = useChat();

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
    const { messages, sendMessage } = useChat();

    const initialMessages = [...messages.value]; // Capture initial state

    // Verify that all messages (including the new user message) are sent to API
    const expectedMessages = [
      ...initialMessages,
      {
        id: initialMessages.length.toString(),
        role: 'user',
        content: 'New message',
      },
    ];

    sendMessage('New message');

    expect(mockFetch).toHaveBeenCalledWith('/api/ai', {
      method: 'POST',
      body: {
        messages: expectedMessages,
      },
    });
  });
});
