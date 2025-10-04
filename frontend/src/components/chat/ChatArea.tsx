'use client';

import React, { useState, useRef, useEffect } from 'react';
import '@/styles/chat/ChatArea.css';

interface ChatAreaProps {
  conversationId: string | null;
  onToggleRightPanel: () => void;
  showRightPanel: boolean;
}

interface ChatMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  content: string;
  time?: string;
  isImage?: boolean;
  imageUrl?: string;
}

const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    type: 'system',
    content: 'Nguyễn Minh Tú đã trả lời tin nhắn chào mừng tự động của bạn. Để thay đổi hoặc gỡ lời chào này, hãy truy cập phần Cài đặt tin nhắn.',
  },
  {
    id: '2',
    type: 'received',
    content: 'Có cỡ của tôi không?',
  },
  {
    id: '3',
    type: 'sent',
    content: 'Chào Tú! Chúng tôi có thể giúp gì cho bạn?',
  },
  {
    id: '4',
    type: 'sent',
    content: 'polo cao cấp độc quyền chất cá sấu Mỹ nhà Lộc Shado  có giá là: 599k ',
  },
  {
    id: '5',
    type: 'sent',
    content: 'Chất cá sấu Mỹ chuẩn form cùng chất liệu in DTG bảo hành lên tới 2 năm',
  },
  {
    id: '6',
    type: 'sent',
    content: 'Nguyễn Minh Tú cho em xin chiều cao và cân nặng để em tư vấn size chính xác cho Anh nha ❤️',
  },
  {
    id: '7',
    type: 'received',
    content: 'M75 125kg',
  },
  {
    id: '8',
    type: 'sent',
    content: 'Siêu phẩm #La_coste này mê quá anh em ạ .\nĐủ size từ 30-120kg cho anh em...',
    isImage: true,
    imageUrl: '/assets/5a84e489-b210-45ad-bccf-1ad38de17efc.png',
  }
];

export default function ChatArea({ conversationId, onToggleRightPanel, showRightPanel }: ChatAreaProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Handle send message logic
      console.log('Sending message:', inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversationId) {
    return (
      <div className="chat-area-empty">
        <p>Chọn một cuộc hội thoại để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="chat-area-container">
      {/* Chat Header */}
      <div className="chat-area-header">
        <img src="/assets/0c199cad-777b-41f4-b025-806841368fde.png" alt="avatar" className="chat-area-header-avatar" />
        <div className="chat-area-header-info">
          <div className="chat-area-header-name-row">
            <div className="chat-area-header-name">Nguyễn Minh Tú</div>
            <div className="chat-area-header-location-icon">
              <img src="/assets/cd46b4db-0eb4-414c-9b51-744ac540cf3d.png" alt="location" />
            </div>
            <div className="chat-area-header-location">Hà Nội</div>
          </div>
          <div className="chat-area-header-status-row">
            <div className="chat-area-status-icon">
              <img src="/assets/d482b35d-4dc2-4b0c-8338-c5c6e59aa68e.png" alt="status" />
            </div>
            <div className="chat-area-status-text">Đã xem bởi Tran Duc Anh - 04/07/2024 20:26</div>
          </div>
          <div className="chat-area-header-actions">
            <button className="chat-area-action-button">
              <img src="/assets/ee3e82e5-0279-4d86-a8c2-d979f6a038b9.png" alt="comment" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/e85d98fe-c892-4b67-b492-b09f85dadcb7.png" alt="message" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/63c793a1-7d01-415f-a354-ce3a3612612c.png" alt="phone" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/867c594c-0e9e-4f78-84bb-d1441648b1a1.png" alt="info" />
            </button>
          </div>
        </div>
        <div className="chat-area-header-right-actions">
          <button className="chat-area-icon-button">
            <img src="/assets/f2224969-56ff-4977-8af1-79091ec9e69c.png" alt="archive" />
          </button>
          <button className="chat-area-icon-button">
            <img src="/assets/2e9973d9-9df2-4e64-a6b4-2d8b9d006a93.png" alt="star" />
          </button>
          <button className="chat-area-icon-button" onClick={onToggleRightPanel}>
            <img src="/assets/d771238c-e5a6-4b89-85fa-2db22a889c87.png" alt="panel" />
          </button>
          <button className="chat-area-icon-button">
            <img src="/assets/dc5ccc5a-a725-412d-ab2c-b7f1faf4fafb.png" alt="more" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-area-messages">
        <div className="chat-area-messages-date-badge">
          <span>4 Thg 07 2024</span>
        </div>
        
        {mockChatMessages.map((message) => (
          <div key={message.id} className={`message-wrapper ${message.type}`}>
            {message.type === 'system' && (
              <div className="chat-area-system-message">
                <p>{message.content}</p>
              </div>
            )}
            
            {message.type === 'received' && (
              <div className="chat-area-message-row received">
                <img src="/assets/bed0f299-8718-42e1-99bb-2318e572a418.png" alt="avatar" className="chat-area-message-avatar" />
                <div className="chat-area-message-bubble received">
                  {message.content}
                </div>
              </div>
            )}
            
            {message.type === 'sent' && !message.isImage && (
              <div className="chat-area-message-row sent">
                <div className="chat-area-message-bubble sent">
                  {message.content}
                </div>
              </div>
            )}
            
            {message.type === 'sent' && message.isImage && (
              <div className="chat-area-message-row sent">
                <div className="chat-area-message-bubble-image">
                  <div className="chat-area-image-container">
                    <img src={message.imageUrl} alt="sent" />
                    <button className="chat-area-image-download">
                      <img src="/assets/4cf588a1-b66c-4acb-ac99-6fe6db0ec42c.png" alt="download" />
                    </button>
                  </div>
                  <p className="chat-area-image-caption">{message.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Tag Selector */}
      <div className="chat-area-tags">
        <div className="chat-area-tags-scroll">
          <div className="chat-area-tag-row">
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(244, 56, 59, 0.4)'}}>Xử lý gấp</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(175, 137, 99, 0.4)'}}>Hương</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(57, 31, 4, 0.4)'}}>P.anh</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(0, 147, 68, 0.4)'}}>P. lê</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(4, 235, 149, 0.4)'}}>KCGM</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(75, 89, 94, 0.4)'}}>Huyền</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(116, 192, 227, 0.4)'}}>M.trang</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(250, 140, 22, 0.4)'}}>LÂM5</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(255, 69, 191, 0.4)'}}>Hà</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(140, 143, 90, 0.4)'}}>KHÁCH RỦI RO</span>
          </div>
          <div className="chat-area-tag-row">
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(246, 38, 178, 0.4)'}}>Tạo tiền</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(237, 156, 4, 0.4)'}}>Chưa tạo tiền</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(188, 141, 161, 0.4)'}}>Khách CK</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(20, 17, 21, 0.4)'}}>Huỷ ko cọc</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(110, 103, 89, 0.4)'}}>UPSALE</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(177, 176, 13, 0.4)'}}>Voucher 1</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(23, 137, 137, 0.4)'}}>Voucher 2</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(12, 13, 14, 0.4)'}}>Spam</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(17, 206, 0, 0.4)'}}>Trang</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(119, 20, 158, 0.4)'}}>Xử lý</span>
          </div>
          <div className="chat-area-tag-row">
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(209, 44, 164, 0.4)'}}>T.Anh</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(172, 127, 163, 0.4)'}}>Lệ</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(96, 68, 68, 0.4)'}}>Tư vấn lại</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(217, 29, 75, 0.4)'}}>Chưa tạo đơn</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(21, 80, 198, 0.4)'}}>Đã tạo đơn</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(193, 209, 47, 0.4)'}}>Khách đặt thêm</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(47, 65, 100, 0.4)'}}>Phượng</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(166, 171, 188, 0.4)'}}>Feedback</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(61, 15, 15, 0.4)'}}>Khách hủy đơn</span>
            <span className="chat-area-tag-item" style={{backgroundColor: 'rgba(60, 211, 133, 0.4)'}}>Đã gọi điện</span>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-area-input">
        <div className="chat-area-input-container">
          <div className="chat-area-input-header">
            <span className="chat-area-input-label">Trả lời từ Lộc Shado</span>
          </div>
          <div className="chat-area-input-row">
            <button className="chat-area-input-action-button">
              <img src="/assets/601ff258-db24-48ef-8a66-5949986974b4.png" alt="emoji" />
            </button>
            <input
              type="text"
              className="chat-area-message-input"
              placeholder="Aa"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="chat-area-input-action-button">
              <img src="/assets/610356be-7e60-430c-98f6-a1d5af448816.png" alt="attach" />
            </button>
            <button className="chat-area-input-action-button notification-badge">
              <img src="/assets/acae7721-3df5-43da-8963-8fafc8dbdfb7.png" alt="notification" />
              <span className="badge"></span>
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/4117eeec-97d6-4b59-8d13-2c648a0300f2.png" alt="gift" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/696a27a1-8972-4395-8945-fbba00f0732e.png" alt="sticker" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/0ba8b068-f527-4a8f-b5e9-9e0a9c83eb17.png" alt="like" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/e6cfcaa0-080c-4608-b436-9adf6067aa95.png" alt="camera" />
            </button>
            <button className="chat-area-input-action-button" onClick={handleSendMessage}>
              <img src="/assets/f8adae6b-1047-40e0-841d-3d3630fb6c01.png" alt="send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
