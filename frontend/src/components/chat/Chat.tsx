'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import LeftSidebar from './LeftSidebar';
import ChatList from './ChatList';
import ChatArea from './ChatArea';
import RightPanel from './RightPanel';
import '@/styles/chat/Chat.css';

interface ChatProps {
  onLogout: () => void;
}

export default function Chat({ onLogout }: ChatProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const toggleRightPanel = () => {
    setShowRightPanel(!showRightPanel);
  };

  return (
    <div className="chat-component-container">
      <Header onLogout={onLogout} />
      
      <div className="chat-component-main-content">
        {/* Left Navigation Sidebar */}
        <LeftSidebar />
        
        {/* Chat List Panel */}
        <ChatList 
          onConversationSelect={handleConversationSelect}
          selectedConversation={selectedConversation}
        />
        
        {/* Main Chat Area */}
        <ChatArea 
          conversationId={selectedConversation}
          onToggleRightPanel={toggleRightPanel}
          showRightPanel={showRightPanel}
        />
        
        {/* Right Information Panel */}
        {showRightPanel && (
          <RightPanel 
            conversationId={selectedConversation}
          />
        )}
      </div>
    </div>
  );
}
