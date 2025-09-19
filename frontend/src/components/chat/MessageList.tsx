'use client';

import React, { useEffect, useRef } from 'react';
import TextMessage from './messages/TextMessage';
import MediaMessage from './messages/MediaMessage';
import SystemMessage from './messages/SystemMessage';
import '@/styles/chat/MessageList.css';

interface Message {
  id: string;
  type: 'text' | 'media' | 'system';
  content: string;
  sender: 'customer' | 'admin' | 'system';
  timestamp: string;
  isRead?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
}

interface MessageListProps {
  conversationId: string;
}

// Mock messages data
const mockMessages: Message[] = [
  {
    id: '1',
    type: 'system',
    content: 'Hôm nay',
    sender: 'system',
    timestamp: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    type: 'text',
    content: 'Ship cod đến tỉnh thành nào?',
    sender: 'customer',
    timestamp: '2024-01-15T08:15:00Z',
    isRead: true
  },
  {
    id: '3',
    type: 'text',
    content: 'Hồng Lê đã trả lời một quảng cáo.',
    sender: 'admin',
    timestamp: '2024-01-15T08:16:00Z'
  },
  {
    id: '4',
    type: 'text',
    content: 'Chào Hồng! Chúng tôi có thể giúp gì cho bạn?',
    sender: 'admin',
    timestamp: '2024-01-15T08:16:30Z'
  },
  {
    id: '5',
    type: 'text',
    content: 'Ship cod đến tỉnh thành nào?',
    sender: 'customer',
    timestamp: '2024-01-15T08:17:00Z',
    isRead: false
  },
  {
    id: '6',
    type: 'text',
    content: 'Dạ, Bộ nỉ cao cấp nhà Chapel Store đang được SALE chỉ còn: 1099k / set',
    sender: 'admin',
    timestamp: '2024-01-15T08:17:30Z'
  },
  {
    id: '7',
    type: 'text',
    content: 'Chapel Store đảm bảo:\n👍 Chất nỉ chân cua cao cấp định lượng 350gsm, độ dày vừa phải đảm bảo độ giữ ấm nhưng vẫn thoáng,\nthấm hút mồ hôi, không gây bí\n👍 HÌNH IN DTG chất lượng cao\n👍 Được KIỂM TRA hàng trước khi thanh toán',
    sender: 'admin',
    timestamp: '2024-01-15T08:18:00Z'
  },
  {
    id: '8',
    type: 'media',
    content: 'Mặc mùa này thì nhức cái nách, sang thui rùi lunnn ạ. 🥰\nOnly: #1099...',
    sender: 'admin',
    timestamp: '2024-01-15T08:18:30Z',
    mediaUrl: '/api/placeholder/350/200',
    mediaType: 'image'
  },
  {
    id: '9',
    type: 'text',
    content: 'Chị cho em xin chiều cao và cân nặng để em tư vấn size chính xác cho mình nha ❤️',
    sender: 'admin',
    timestamp: '2024-01-15T08:19:00Z'
  }
];

export default function MessageList({ conversationId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = mockMessages; // TODO: Fetch messages based on conversationId

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'text':
        return (
          <TextMessage
            key={message.id}
            message={message}
          />
        );
      case 'media':
        return (
          <MediaMessage
            key={message.id}
            message={message}
          />
        );
      case 'system':
        return (
          <SystemMessage
            key={message.id}
            message={message}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="message-list-component">
      <div className="message-list-content">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
