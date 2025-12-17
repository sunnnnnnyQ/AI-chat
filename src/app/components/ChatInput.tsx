import { useState, KeyboardEvent } from 'react';
import { Button } from './ui/button';

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的消息... (按 Enter 发送，Shift + Enter 换行)"
        disabled={disabled}
        className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] max-h-[200px]"
        rows={1}
        style={{
          height: 'auto',
          minHeight: '52px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 200) + 'px';
        }}
      />
      <Button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed h-[52px]"
      >
        发送
      </Button>
    </div>
  );
}
