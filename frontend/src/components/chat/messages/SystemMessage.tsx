'use client';

import React from 'react';
import '@/styles/chat/messages/SystemMessage.css';

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'admin' | 'system';
  timestamp: string;
}

interface SystemMessageProps {
  message: Message;
}

export default function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="system-message-component">
      <div className="system-message-content">
        <div className="system-message-bubble">
          <span className="system-message-text">
            {message.content}
          </span>
        </div>
      </div>
    </div>
  );
}
