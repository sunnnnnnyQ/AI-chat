import { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, MessageSquare, Star, Clock } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { requestOpenRouterCompletion } from './lib/openrouter';
import { Message } from './types/chat';

interface Conversation {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  pinned?: boolean;
  unread?: number;
  messages: Message[];
}

interface InsightCard {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

const quickSuggestions = [
  '帮我总结一下上午的会议',
  '为新品发布会准备宣传文案',
  '整理今天的工作亮点',
  '生成一个周末出游计划',
];

const insightCards: InsightCard[] = [
  {
    label: '理解度',
    value: '98%',
    description: '持续保持高质量回答',
    icon: Star,
  },
  {
    label: '响应速度',
    value: '1.2s',
    description: '最近 20 条消息',
    icon: Clock,
  },
];

const SYSTEM_PROMPT =
  '你是一个中文优先的 AI 协作助手，擅长总结、拆解计划并给出可执行建议。回答时保持亲和、清晰、有条理。';

const initialConversations: Conversation[] = [
  {
    id: 'product-launch',
    title: '新品发布筹备',
    description: '梳理核心卖点与活动流程',
    timestamp: '09:24',
    pinned: true,
    unread: 2,
    messages: [
      {
        id: 'pl-1',
        content: '我们计划在 11 月底发布全新的 AI 功能，需要帮忙梳理亮点。',
        role: 'user',
        timestamp: new Date('2024-10-30T09:24:00'),
      },
      {
        id: 'pl-2',
        content:
          '我已经汇总了市场上同类功能的定位，并列出 3 个差异化优势，你想先看哪一部分？',
        role: 'assistant',
        timestamp: new Date('2024-10-30T09:25:00'),
      },
    ],
  },
  {
    id: 'travel-plan',
    title: '杭州周末行程',
    description: '轻松惬意的城市漫游',
    timestamp: '08:10',
    messages: [
      {
        id: 'tp-1',
        content: '想安排一个两天一夜的放松行程，重点体验美食和咖啡。',
        role: 'user',
        timestamp: new Date('2024-10-29T08:10:00'),
      },
      {
        id: 'tp-2',
        content:
          '收到，我先梳理五个必去地点，并搭配周边咖啡、步行路线。也可以顺便安排行程提醒。',
        role: 'assistant',
        timestamp: new Date('2024-10-29T08:11:00'),
      },
    ],
  },
  {
    id: 'daily-notes',
    title: '工作日报助手',
    description: '把零散想法整理成可分享内容',
    timestamp: '昨天',
    messages: [
      {
        id: 'dn-1',
        content: '帮我把今天和研发团队讨论的重点整理成日报。',
        role: 'user',
        timestamp: new Date('2024-10-28T20:45:00'),
      },
      {
        id: 'dn-2',
        content: '好的，我会按「进展 / 风险 / 资源」三个栏目来生成初稿。',
        role: 'assistant',
        timestamp: new Date('2024-10-28T20:46:00'),
      },
    ],
  },
];

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationRef = useRef(activeId);
  const requestControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const messageCount = activeConversation?.messages.length ?? 0;

  useEffect(() => {
    activeConversationRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount, isTyping, activeId]);

  useEffect(() => {
    setIsTyping(false);
  }, [activeId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !activeConversation) return;
    const targetId = activeConversation.id;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    const pendingMessages = [...activeConversation.messages, userMessage];

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === targetId
          ? { ...conversation, messages: pendingMessages, unread: 0 }
          : conversation,
      ),
    );

    setIsTyping(true);

    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
    }
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const aiText = await requestOpenRouterCompletion(pendingMessages, {
        signal: controller.signal,
        systemPrompt: SYSTEM_PROMPT,
      });

      const aiMessage: Message = {
        id: `${Date.now()}-ai`,
        content: aiText,
        role: 'assistant',
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === targetId
            ? { ...conversation, messages: [...conversation.messages, aiMessage] }
            : conversation,
        ),
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const fallbackMessage =
        error instanceof Error ? error.message : '未知错误，请稍后重试。';

      const errorReply: Message = {
        id: `${Date.now()}-error`,
        content: `抱歉，我暂时无法完成这个请求：${fallbackMessage}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === targetId
            ? { ...conversation, messages: [...conversation.messages, errorReply] }
            : conversation,
        ),
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (activeConversationRef.current === targetId) {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050714] via-[#080d24] to-[#0f172a] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <Sparkles className="size-4 text-violet-300" />
              AI Chat Companion
            </p>
            <h1 className="mt-1 text-2xl font-semibold">一体化 AI 工作流中心</h1>
            <p className="text-sm text-white/70">同步记录 / 灵感激发 / 即时总结</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/60">
            {['灵感加速', '文件助手', '会议伙伴'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="space-y-6 rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-violet-300" />
                <span>正在对话</span>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">
                新建会话
              </button>
            </div>

            <div className="space-y-3">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversation?.id;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveId(conversation.id)}
                    className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-white/20 bg-white text-gray-900 shadow-lg'
                        : 'border-white/5 bg-white/5 text-white/80 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${isActive ? 'bg-gray-900/10 text-gray-500' : 'bg-white/10 text-white/70'}`}>
                        {conversation.pinned ? '置顶' : '灵感'}
                      </span>
                      <span className={isActive ? 'text-gray-500' : 'text-white/60'}>
                        {conversation.timestamp}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-base font-semibold ${
                        isActive ? 'text-gray-900' : 'text-white'
                      }`}
                    >
                      {conversation.title}
                    </p>
                    <p className={isActive ? 'text-gray-500 text-sm' : 'text-white/70 text-sm'}>
                      {conversation.description}
                    </p>
                    {conversation.unread ? (
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          isActive ? 'bg-gray-900/5 text-gray-600' : 'bg-white text-gray-900'
                        }`}
                      >
                        {conversation.unread} 条新内容
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div>
              <p className="text-sm text-white/70">快速提示</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isTyping}
                    className="rounded-full border border-white/5 bg-white/10 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {insightCards.map(({ label, value, description, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Icon className="size-4 text-violet-200" />
                    {label}
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                  <p className="text-sm text-white/70">{description}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex flex-col rounded-3xl bg-white text-gray-900 shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  {activeConversation?.timestamp} · 智能模式
                </p>
                <h2 className="text-xl font-semibold">{activeConversation?.title}</h2>
                <p className="text-sm text-gray-500">{activeConversation?.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                <span className="rounded-full border border-gray-200 px-3 py-1">持续同步</span>
                <span className="rounded-full border border-gray-200 px-3 py-1">可引用外部文件</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-gray-50 via-white to-white px-6 py-6">
              {activeConversation?.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isTyping && (
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    AI
                  </div>
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '120ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '240ms' }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">⚡ 智能洞察</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">🧠 长记忆已开启</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">📎 支持文件引用</span>
              </div>
              <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
              <div className="mt-3 text-xs text-gray-500">
                Enter 发送 · Shift + Enter 换行 · 草稿将自动保存在当前会话
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
