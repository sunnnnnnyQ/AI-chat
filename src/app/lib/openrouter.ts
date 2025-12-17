import { Message } from '../types/chat';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'x-ai/grok-4.1-fast';

interface RequestOptions {
  signal?: AbortSignal;
  systemPrompt?: string;
}

interface ChatPayloadMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function requestOpenRouterCompletion(
  messages: Message[],
  options: RequestOptions = {},
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('缺少 OpenRouter API Key，请在环境变量 VITE_OPENROUTER_API_KEY 中配置。');
  }

  const referer =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'http://localhost';

  const payloadMessages: ChatPayloadMessage[] = [
    options.systemPrompt ? { role: 'system', content: options.systemPrompt } : null,
    ...messages.map(({ role, content }) => ({ role, content })),
  ].filter(Boolean) as ChatPayloadMessage[];

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': 'AI Chat Interface',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: payloadMessages,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter 请求失败（${response.status}）: ${errorText || response.statusText}`,
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('OpenRouter 返回内容为空，请稍后再试。');
  }

  return content;
}
