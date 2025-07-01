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

describe('useChat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('should send a user message and receive an assistant response', () => {
    const { messages, sendMessage } = useChat();

    const initialMessageCount = messages.value.length;
    const testMessage = 'Test message';

    sendMessage(testMessage);

    // User message should be added immediately
    expect(messages.value).toHaveLength(initialMessageCount + 1);
    expect(messages.value[messages.value.length - 1]).toEqual({
      id: initialMessageCount.toString(),
      role: 'user',
      content: testMessage,
    });

    // Fast forward timers to trigger assistant response
    vi.advanceTimersByTime(200);

    // Assistant response should be added after timeout
    expect(messages.value).toHaveLength(initialMessageCount + 2);
    expect(messages.value[messages.value.length - 1]).toEqual({
      id: (initialMessageCount + 1).toString(),
      role: 'assistant',
      content: `You said: ${testMessage}`,
    });
  });

  it('should create message with correct structure', () => {
    const { messages, sendMessage } = useChat();

    const initialMessageCount = messages.value.length;
    const testMessage = 'Test content';

    sendMessage(testMessage);

    const newMessage = messages.value[messages.value.length - 1];

    expect(newMessage).toEqual({
      id: initialMessageCount.toString(),
      role: 'user',
      content: testMessage,
    });
  });

  it('should generate sequential IDs for messages', () => {
    const { messages, sendMessage } = useChat();

    const initialCount = messages.value.length;

    sendMessage('First message');
    sendMessage('Second message');

    // Fast forward to get assistant responses
    vi.advanceTimersByTime(400);

    // Check that IDs are sequential
    expect(messages.value[initialCount]?.id).toBe(initialCount.toString());
    expect(messages.value[initialCount + 1]?.id).toBe((initialCount + 1).toString());
    expect(messages.value[initialCount + 2]?.id).toBe((initialCount + 2).toString());
    expect(messages.value[initialCount + 3]?.id).toBe((initialCount + 3).toString());
  });

  it('should handle multiple rapid message sends', () => {
    const { messages, sendMessage } = useChat();

    const initialCount = messages.value.length;

    // Send multiple messages rapidly
    sendMessage('Message 1');
    sendMessage('Message 2');
    sendMessage('Message 3');

    // All user messages should be added immediately
    expect(messages.value).toHaveLength(initialCount + 3);
    expect(messages.value[initialCount]?.content).toBe('Message 1');
    expect(messages.value[initialCount + 1]?.content).toBe('Message 2');
    expect(messages.value[initialCount + 2]?.content).toBe('Message 3');

    // Fast forward to get all assistant responses
    vi.advanceTimersByTime(200);

    // All assistant responses should be present
    expect(messages.value).toHaveLength(initialCount + 6);
    expect(messages.value[initialCount + 3]?.content).toBe('You said: Message 1');
    expect(messages.value[initialCount + 4]?.content).toBe('You said: Message 2');
    expect(messages.value[initialCount + 5]?.content).toBe('You said: Message 3');
  });
});
