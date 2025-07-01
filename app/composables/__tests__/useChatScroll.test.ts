import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import useChatScroll from '../useChatScroll';

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    useTemplateRef: vi.fn(),
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
    onUpdated: vi.fn(),
    nextTick: vi.fn(() => Promise.resolve()),
  };
});

describe('useChatScroll', () => {
  const mockScrollContainer = {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const mockTextarea = { focus: vi.fn() };

  it('should initialize with isAtBottom true and showScrollButton false', () => {
    vi.mocked(useTemplateRef)
      .mockReturnValueOnce(ref(mockScrollContainer))
      .mockReturnValueOnce(ref(mockTextarea));

    const { isAtBottom, showScrollButton } = useChatScroll();
    expect(isAtBottom.value).toBe(true);
    expect(showScrollButton.value).toBe(false);
  });

  it('scrollToBottom should set scrollTop to bottom when immediate is true', () => {
    vi.mocked(useTemplateRef)
      .mockReturnValueOnce(ref(mockScrollContainer))
      .mockReturnValueOnce(ref(mockTextarea));

    const { scrollToBottom } = useChatScroll();
    scrollToBottom(true); // 直接滑到底
    expect(mockScrollContainer.scrollTop).toBe(600); // 1000 - 400
  });

  it('pinToBottom should scroll only when isAtBottom is true', async () => {
    vi.mocked(useTemplateRef)
      .mockReturnValueOnce(ref(mockScrollContainer))
      .mockReturnValueOnce(ref(mockTextarea));

    const { isAtBottom, pinToBottom } = useChatScroll();
    isAtBottom.value = true;
    await pinToBottom();
    expect(mockScrollContainer.scrollTop).toBe(1000);

    isAtBottom.value = false;
    mockScrollContainer.scrollTop = 0;
    await pinToBottom();
    expect(mockScrollContainer.scrollTop).toBe(0);
  });
});
