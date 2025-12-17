export type ChatRole = 'user' | 'assistant';

export interface Message {
  id: string;
  content: string;
  role: ChatRole;
  timestamp: Date;
}
