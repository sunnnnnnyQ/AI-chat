import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
          isUser
            ? 'bg-gradient-to-br from-green-400 to-blue-500'
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}
      >
        {isUser ? '我' : 'AI'}
      </div>

      {/* Message Bubble */}
      <div
        className={`flex-1 max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-green-400 to-blue-500 text-white ml-auto'
            : 'bg-white text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`mt-1 ${
            isUser ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
