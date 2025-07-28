import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1, Message } from 'ai';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';

/** Create Ollama for local use */
export const createOllamaModel = () => {
  const ollama = createOllama();
  return ollama('llama3.2');
};

/** Create OpenAI model (online) */
export const createOpenAIModel = (apiKey: string) => {
  const openai = createOpenAI({
    apiKey,
  });
  return openai('gpt-4o-mini');
};

export async function generateChatResponse(model: LanguageModelV1, messages: Message[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid messages format');
  }

  const response = await generateText({
    model,
    messages,
  });

  return response.text.trim();
}
