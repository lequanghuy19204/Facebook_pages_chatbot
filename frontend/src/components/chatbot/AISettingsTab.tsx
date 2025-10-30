'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import ApiService, { AIChatbotSettings, CreateAISettingsDto, UpdateAISettingsDto } from '@/services/api';
import { toast } from 'react-toastify';

const AI_PROVIDERS = [
  { 
    value: 'openai', 
    label: 'OpenAI', 
    models: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini ($0.60/$2.40 per 1M tokens)' },
      { value: 'gpt-4.1', label: 'gpt-4.1 ($0.80/$3.20 per 1M tokens)' },
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini ($0.40/$1.60 per 1M tokens)' },
      { value: 'gpt-4o', label: 'gpt-4o ($5.00/$20.00 per 1M tokens)' },
      { value: 'gpt-5-mini', label: 'gpt-5-mini ($0.25/$2.00 per 1M tokens)' },
      { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano ($0.20/$0.80 per 1M tokens)' },
      { value: 'gpt-4o-2024-11-20', label: 'gpt-4o-2024-11-20 ($5.00/$20.00 per 1M tokens)' },
      { value: 'gpt-5-nano', label: 'gpt-5-nano ($0.05/$0.40 per 1M tokens)' },
      { value: 'o1-mini', label: 'o1-mini ($0.20/$0.60 per 1M tokens)' },
      { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo ($0.50/$1.50 per 1M tokens)' }
    ]
  },
  { 
    value: 'google', 
    label: 'Google AI', 
    models: [
      { value: 'models/gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite ($0.10/$0.40 per 1M tokens)' },
      { value: 'models/gemini-2.0-flash-lite-001', label: 'gemini-2.0-flash-lite-001 ($0.075/$0.30 per 1M tokens)' },
      { value: 'models/gemini-2.5-flash', label: 'gemini-2.5-flash ($0.15/$0.60 per 1M tokens)' },
      { value: 'models/gemini-2.0-flash-001', label: 'gemini-2.0-flash-001 ($0.10/$0.40 per 1M tokens)' },
      { value: 'models/gemini-2.5-pro', label: 'gemini-2.5-pro ($1.25/$10.00 per 1M tokens)' },
      { value: 'models/gemini-2.0-pro-exp', label: 'gemini-2.0-pro-exp ($1.00/$8.00 per 1M tokens)' },
      { value: 'models/gemini-flash-latest', label: 'gemini-flash-latest ($0.15/$0.60 per 1M tokens)' },
      { value: 'models/gemini-2.0-flash-thinking-exp-1219', label: 'gemini-2.0-flash-thinking-exp-1219 ($0.15/$0.60 per 1M tokens)' },
      { value: 'models/aqa', label: 'aqa ($0.20/$0.80 per 1M tokens)' },
      { value: 'models/gemini-2.5-flash-lite-preview-09-2025', label: 'gemini-2.5-flash-lite-preview-09-2025 ($0.10/$0.40 per 1M tokens)' }
    ]
  }
];

export default function AISettingsTab() {
  const { token } = useAuth();
  const { pages } = useFacebook();
  
  const [settings, setSettings] = useState<AIChatbotSettings>({
    company_id: '',
    ai_provider: 'openai',
    ai_model: 'gpt-4',
    api_key: '',
    is_active: false,
    temperature: 0.7,
    max_tokens: 1000,
    response_delay: 2,
    fallback_enabled: true,
    send_no_info_message: true,
    system_prompt: 'Bạn là trợ lý AI thông minh, hỗ trợ khách hàng một cách chuyên nghiệp và thân thiện.',
    enabled_facebook_page_ids: []
  });

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isNewSettings, setIsNewSettings] = useState(false);

  const selectedProvider = AI_PROVIDERS.find(p => p.value === settings.ai_provider);

  // Load settings on mount
  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await ApiService.chatbot.getAISettings(token!);
      setSettings(data);
      setIsNewSettings(false);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        // Settings not found, user can create new
        setIsNewSettings(true);
        toast.info('Chưa có cấu hình AI. Vui lòng tạo cấu hình mới.');
      } else {
        toast.error('Không thể tải cấu hình AI: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const providerInfo = AI_PROVIDERS.find(p => p.value === provider);
    const firstModel = providerInfo?.models[0];
    setSettings({
      ...settings,
      ai_provider: provider,
      ai_model: typeof firstModel === 'string' ? firstModel : firstModel?.value || ''
    });
  };

  const handlePageToggle = (pageId: string) => {
    const isEnabled = settings.enabled_facebook_page_ids.includes(pageId);
    if (isEnabled) {
      setSettings({
        ...settings,
        enabled_facebook_page_ids: settings.enabled_facebook_page_ids.filter(id => id !== pageId)
      });
    } else {
      setSettings({
        ...settings,
        enabled_facebook_page_ids: [...settings.enabled_facebook_page_ids, pageId]
      });
    }
  };

  const handleSelectAllPages = () => {
    const allPageIds = pages.map(page => page.facebook_page_id);
    setSettings({
      ...settings,
      enabled_facebook_page_ids: allPageIds
    });
    toast.success(`Đã chọn tất cả ${allPageIds.length} trang`);
  };

  const handleDeselectAllPages = () => {
    setSettings({
      ...settings,
      enabled_facebook_page_ids: []
    });
    toast.success('Đã xóa chọn tất cả các trang');
  };

  const handleTestConnection = async () => {
    if (!settings.api_key) {
      toast.error('Vui lòng nhập API key');
      return;
    }

    setTestingConnection(true);
    try {
      const result = await ApiService.chatbot.testConnection(token!, {
        ai_provider: settings.ai_provider,
        api_key: settings.api_key,
      });
      
      if (result.success) {
        toast.success(result.message || 'Kết nối thành công!');
      } else {
        toast.error(result.message || 'Kết nối thất bại');
      }
    } catch (error: any) {
      toast.error('Lỗi khi kiểm tra kết nối: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!settings.api_key || !settings.system_prompt) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setSaveLoading(true);
    try {
      if (isNewSettings) {
        // Create new settings
        const dto: CreateAISettingsDto = {
          ai_provider: settings.ai_provider,
          ai_model: settings.ai_model,
          api_key: settings.api_key,
          is_active: settings.is_active,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          response_delay: settings.response_delay,
          fallback_enabled: settings.fallback_enabled,
          send_no_info_message: settings.send_no_info_message,
          system_prompt: settings.system_prompt,
          enabled_facebook_page_ids: settings.enabled_facebook_page_ids,
        };
        const data = await ApiService.chatbot.createAISettings(token!, dto);
        setSettings(data);
        setIsNewSettings(false);
        toast.success('Tạo cấu hình AI thành công!');
      } else {
        // Update existing settings
        const dto: UpdateAISettingsDto = {
          ai_provider: settings.ai_provider,
          ai_model: settings.ai_model,
          api_key: settings.api_key,
          is_active: settings.is_active,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          response_delay: settings.response_delay,
          fallback_enabled: settings.fallback_enabled,
          send_no_info_message: settings.send_no_info_message,
          system_prompt: settings.system_prompt,
          enabled_facebook_page_ids: settings.enabled_facebook_page_ids,
        };
        const data = await ApiService.chatbot.updateAISettings(token!, dto);
        setSettings(data);
        toast.success('Cập nhật cấu hình AI thành công!');
      }
    } catch (error: any) {
      toast.error('Lỗi khi lưu cấu hình: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="chatbot-ai-settings-tab">
      {loading ? (
        <div className="chatbot-empty-state">
          <p>Đang tải cấu hình...</p>
        </div>
      ) : (
        <>
          <div className="chatbot-settings-card">
        <div className="chatbot-settings-card-header">
          <h2 className="chatbot-settings-card-title">Cấu hình AI Provider</h2>
          <p className="chatbot-settings-card-description">
            Chọn nhà cung cấp AI và cấu hình API key để kích hoạt chatbot
          </p>
        </div>

        <div className="chatbot-settings-form">
          {/* AI Provider Selection */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">
              AI Provider
              <span className="chatbot-required">*</span>
            </label>
            <select
              className="chatbot-form-select"
              value={settings.ai_provider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {AI_PROVIDERS.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Model Selection */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">
              AI Model
              <span className="chatbot-required">*</span>
            </label>
            <select
              className="chatbot-form-select"
              value={settings.ai_model}
              onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
            >
              {selectedProvider?.models.map(model => {
                const modelValue = typeof model === 'string' ? model : model.value;
                const modelLabel = typeof model === 'string' ? model : model.label;
                return (
                  <option key={modelValue} value={modelValue}>
                    {modelLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {/* API Key */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">
              API Key
              <span className="chatbot-required">*</span>
            </label>
            <div className="chatbot-api-key-input-wrapper">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="chatbot-form-input"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="Nhập API key của bạn"
              />
              <button
                type="button"
                className="chatbot-api-key-toggle"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <button
              className="chatbot-test-connection-btn"
              onClick={handleTestConnection}
              disabled={!settings.api_key || testingConnection}
            >
              {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
          </div>

          {/* System Prompt */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">
              System Prompt
              <span className="chatbot-required">*</span>
            </label>
            <textarea
              className="chatbot-form-textarea"
              value={settings.system_prompt}
              onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
              rows={4}
              placeholder="Mô tả vai trò và hành vi của AI chatbot"
            />
            <p className="chatbot-form-hint">
              Hướng dẫn AI về cách trả lời và tính cách của chatbot
            </p>
          </div>
        </div>
      </div>

      {/* Chatbot Settings */}
      <div className="chatbot-settings-card">
        <div className="chatbot-settings-card-header">
          <h2 className="chatbot-settings-card-title">Cài đặt Chatbot</h2>
          <p className="chatbot-settings-card-description">
            Tùy chỉnh hành vi và tính năng của chatbot
          </p>
        </div>

        <div className="chatbot-settings-form">
          {/* Active Toggle */}
          <div className="chatbot-form-group-inline">
            <div className="chatbot-form-group-inline-content">
              <label className="chatbot-form-label">Kích hoạt Chatbot</label>
              <p className="chatbot-form-hint">Bật/tắt chatbot cho toàn công ty</p>
            </div>
            <label className="chatbot-toggle-switch">
              <input
                type="checkbox"
                checked={settings.is_active}
                onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              />
              <span className="chatbot-toggle-slider"></span>
            </label>
          </div>

          {/* Fallback Toggle */}
          <div className="chatbot-form-group-inline">
            <div className="chatbot-form-group-inline-content">
              <label className="chatbot-form-label">Chuyển sang người khi không có câu trả lời</label>
              <p className="chatbot-form-hint">Tự động chuyển hội thoại cho nhân viên khi chatbot không tìm thấy câu trả lời phù hợp</p>
            </div>
            <label className="chatbot-toggle-switch">
              <input
                type="checkbox"
                checked={settings.fallback_enabled}
                onChange={(e) => setSettings({ ...settings, fallback_enabled: e.target.checked })}
              />
              <span className="chatbot-toggle-slider"></span>
            </label>
          </div>

          {/* Send No Info Message Toggle */}
          <div className="chatbot-form-group-inline">
            <div className="chatbot-form-group-inline-content">
              <label className="chatbot-form-label">Gửi thông báo "Không có thông tin"</label>
              <p className="chatbot-form-hint">Khi chatbot không có câu trả lời, gửi tin nhắn thông báo cho khách hàng trước khi chuyển cho nhân viên. Nếu tắt, chỉ chuyển sang nhân viên mà không gửi tin nhắn.</p>
            </div>
            <label className="chatbot-toggle-switch">
              <input
                type="checkbox"
                checked={settings.send_no_info_message}
                onChange={(e) => setSettings({ ...settings, send_no_info_message: e.target.checked })}
              />
              <span className="chatbot-toggle-slider"></span>
            </label>
          </div>

          {/* Temperature Slider */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              className="chatbot-form-slider"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
            />
            <div className="chatbot-slider-labels">
              <span>0.0 (Chính xác)</span>
              <span>1.0 (Sáng tạo)</span>
            </div>
            <p className="chatbot-form-hint">
              Điều chỉnh độ sáng tạo của AI. Giá trị thấp cho câu trả lời chính xác, giá trị cao cho câu trả lời đa dạng hơn
            </p>
          </div>

          {/* Max Tokens */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">Số tokens tối đa</label>
            <input
              type="number"
              className="chatbot-form-input"
              min="1000"
              max="10000"
              value={settings.max_tokens}
              onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
            />
            <p className="chatbot-form-hint">
              Giới hạn độ dài câu trả lời (1000-10000 tokens)
            </p>
          </div>

          {/* Response Delay */}
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">Độ trễ trước khi gửi (giây)</label>
            <input
              type="number"
              className="chatbot-form-input"
              min="0"
              max="30"
              value={settings.response_delay}
              onChange={(e) => setSettings({ ...settings, response_delay: parseInt(e.target.value) })}
            />
            <p className="chatbot-form-hint">
              Thời gian chờ trước khi gửi câu trả lời (0-30 giây)
            </p>
          </div>
        </div>
      </div>

      {/* Facebook Pages Permissions */}
      <div className="chatbot-settings-card">
        <div className="chatbot-settings-card-header">
          <div className="chatbot-settings-card-header-with-actions">
            <div>
              <h2 className="chatbot-settings-card-title">Phân quyền Facebook Pages</h2>
              <p className="chatbot-settings-card-description">
                Chọn các trang Facebook được phép sử dụng chatbot
              </p>
            </div>
            {pages.length > 0 && (
              <div className="chatbot-settings-card-actions">
                <button 
                  className="chatbot-btn-select-action"
                  onClick={handleSelectAllPages}
                  title="Chọn tất cả các trang"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Chọn tất cả
                </button>
                <button 
                  className="chatbot-btn-select-action chatbot-btn-deselect"
                  onClick={handleDeselectAllPages}
                  title="Xóa chọn tất cả"
                  disabled={settings.enabled_facebook_page_ids.length === 0}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="chatbot-pages-list">
          {pages.length === 0 ? (
            <div className="chatbot-empty-state">
              <p>Chưa có trang Facebook nào được kết nối</p>
            </div>
          ) : (
            pages.map(page => {
              const isEnabled = settings.enabled_facebook_page_ids.includes(page.facebook_page_id);
              return (
                <div key={page.facebook_page_id} className="chatbot-page-item">
                  <div className="chatbot-page-info">
                    <div className="chatbot-page-avatar">
                      {page.picture_url ? (
                        <img src={page.picture_url} alt={page.name} />
                      ) : (
                        <div className="chatbot-page-avatar-placeholder">
                          {page.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="chatbot-page-details">
                      <div className="chatbot-page-name">{page.name}</div>
                      <div className="chatbot-page-id">{page.facebook_page_id}</div>
                    </div>
                  </div>
                  <label className="chatbot-toggle-switch">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handlePageToggle(page.facebook_page_id)}
                    />
                    <span className="chatbot-toggle-slider"></span>
                  </label>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="chatbot-settings-actions">
        <button
          className="chatbot-btn-primary"
          onClick={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
        </>
      )}
    </div>
  );
}
