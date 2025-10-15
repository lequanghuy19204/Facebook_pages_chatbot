'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ApiService, { FacebookTag } from '@/services/api';
import socketService from '@/services/socket';
import '@/styles/chat/ConversationTags.css';

interface ConversationTagsProps {
  conversation?: any;
  onTagsUpdate?: (tags: string[]) => void;
}

interface TagWithState extends FacebookTag {
  active: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

export default function ConversationTags({ conversation, onTagsUpdate }: ConversationTagsProps) {
  const [allTags, setAllTags] = useState<TagWithState[]>([]);
  const [loading, setLoading] = useState(false);

  const getCacheKey = useCallback((pageId: string) => {
    return `conversation_tags_cache_${pageId}`;
  }, []);

  const loadTagsFromCache = useCallback((pageId: string): FacebookTag[] | null => {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = getCacheKey(pageId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(cacheKey);
      return null;
    } catch {
      return null;
    }
  }, [getCacheKey]);

  const saveTagsToCache = useCallback((pageId: string, tags: FacebookTag[]) => {
    if (typeof window === 'undefined') return;
    
    const cacheKey = getCacheKey(pageId);
    localStorage.setItem(cacheKey, JSON.stringify({
      data: tags,
      timestamp: Date.now(),
    }));
  }, [getCacheKey]);

  const updateTagsWithConversation = useCallback((tags: FacebookTag[]) => {
    const conversationTagIds = conversation?.tags || [];
    const tagsWithState: TagWithState[] = tags.map(tag => ({
      ...tag,
      active: conversationTagIds.includes(tag.tag_id),
    }));
    setAllTags(tagsWithState);
  }, [conversation?.tags]);

  const fetchTags = useCallback(async (pageId: string) => {
    if (typeof window === 'undefined') return;

    const cachedTags = loadTagsFromCache(pageId);
    if (cachedTags) {
      console.log(`✅ ConversationTags: Loaded ${cachedTags.length} tags from cache for page ${pageId}`);
      updateTagsWithConversation(cachedTags);
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      setLoading(true);
      console.log(`📥 ConversationTags: Fetching tags for page ${pageId}...`);
      const response = await ApiService.tags.getTags(token, { facebook_page_id: pageId });
      const tags = response.data || [];
      console.log(`✅ ConversationTags: Fetched ${tags.length} tags for page ${pageId}`);
      saveTagsToCache(pageId, tags);
      updateTagsWithConversation(tags);
    } catch (error) {
      console.error('ConversationTags: Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, [loadTagsFromCache, saveTagsToCache, updateTagsWithConversation]);

  useEffect(() => {
    if (conversation?.facebook_page_id) {
      console.log(`🔄 Conversation changed - Page ID: ${conversation.facebook_page_id}, Conversation ID: ${conversation.conversation_id}`);
      fetchTags(conversation.facebook_page_id);
    } else {
      setAllTags([]);
    }
  }, [conversation?.facebook_page_id, fetchTags]);

  useEffect(() => {
    if (!conversation?.conversation_id) return;

    const handleConversationUpdated = (data: any) => {
      if (data.conversation_id === conversation.conversation_id && data.tags !== undefined) {
        setAllTags(prev => prev.map(tag => ({
          ...tag,
          active: data.tags.includes(tag.tag_id),
        })));
        
        if (onTagsUpdate) {
          onTagsUpdate(data.tags);
        }
      }
    };

    socketService.onConversationUpdated(handleConversationUpdated);

    return () => {
      socketService.off('conversation_updated', handleConversationUpdated);
    };
  }, [conversation?.conversation_id, onTagsUpdate]);

  const handleTagClick = useCallback(async (tag: TagWithState) => {
    if (!conversation?.conversation_id || typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const currentTagIds = conversation.tags || [];
      
      if (tag.active) {
        await ApiService.tags.removeTagFromConversation(token, conversation.conversation_id, tag.tag_id);
        const newTags = currentTagIds.filter((id: string) => id !== tag.tag_id);
        if (onTagsUpdate) onTagsUpdate(newTags);
      } else {
        const newTagIds = [...currentTagIds, tag.tag_id];
        await ApiService.tags.assignTagsToConversation(token, conversation.conversation_id, newTagIds);
        if (onTagsUpdate) onTagsUpdate(newTagIds);
      }
    } catch (error: any) {
      console.error('Failed to toggle tag:', error);
    }
  }, [conversation?.conversation_id, conversation?.tags, onTagsUpdate]);

  if (!conversation || allTags.length === 0) {
    return null;
  }

  return (
    <div className="conversation-tags-wrapper-ConversationTags">
      <div className="conversation-tags-container-ConversationTags">
        <div className="conversation-tags-row-ConversationTags">
          {allTags.map((tag) => (
            <div
              key={tag.tag_id}
              className={`conversation-tag-item-ConversationTags ${tag.active ? 'active' : ''}`}
              style={{ backgroundColor: tag.tag_color }}
              onClick={() => handleTagClick(tag)}
              title={tag.tag_name}
            >
              <span className="tag-text-ConversationTags">{tag.tag_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

