import { z } from 'zod';

// Chat related schemas
export const CreateChatSchema = z.strictObject({
  title: z.string().min(1).optional(),
  projectId: z.uuid().optional(),
});

export const UpdateChatTitleSchema = z.strictObject({
  message: z.string().min(1),
});

// Message role enum and type definition
const MessageRole = z.enum(['user', 'assistant']);

// Base message schema
export const MessageSchema = z.strictObject({
  content: z.string(),
  role: MessageRole,
  id: z.uuid().optional(),
  chatId: z.uuid().optional(),
});

// Chat and message related schemas
export const ChatMessageSchema = z.strictObject({
  messages: z.array(MessageSchema),
  chatId: z.uuid(),
});

export const CreateMessageSchema = z.strictObject({
  content: z.string().min(1),
  role: MessageRole,
});

// Project related schemas
export const CreateProjectSchema = z.strictObject({
  name: z.string().min(1),
});

export const UpdateProjectSchema = z.strictObject({
  name: z.string().min(1),
});

export const UpdateChatSchema = z.strictObject({
  projectId: z.uuid(),
});
