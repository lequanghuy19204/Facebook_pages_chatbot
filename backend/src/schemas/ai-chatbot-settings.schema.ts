import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AIChatbotSettingsDocument = AIChatbotSettings & Document;

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE = 'azure',
}

@Schema({ 
  collection: 'ai_chatbot_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
export class AIChatbotSettings {
  @Prop({ required: true, unique: true })
  setting_id: string;

  @Prop({ required: true, unique: true })
  company_id: string;

  @Prop({ required: true, enum: Object.values(AIProvider) })
  ai_provider: string;

  @Prop({ required: true })
  ai_model: string;

  @Prop({ required: true })
  api_key: string; // Encrypted API key

  @Prop({ required: true, default: false })
  is_active: boolean;

  @Prop({ required: true, default: 0.7, min: 0, max: 2 })
  temperature: number;

  @Prop({ required: true, default: 1000, min: 100, max: 10000 })
  max_tokens: number;

  @Prop({ required: true, default: 2, min: 0, max: 30 })
  response_delay: number;

  @Prop({ required: true, default: true })
  fallback_enabled: boolean;

  @Prop({ required: true, default: true })
  send_no_info_message: boolean; // Gửi tin nhắn "không có thông tin" cho khách trước khi chuyển human

  @Prop({ required: true })
  system_prompt: string;

  @Prop({ type: [String], default: [] })
  enabled_facebook_page_ids: string[];

  @Prop()
  created_by: string;

  @Prop()
  updated_by: string;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export const AIChatbotSettingsSchema = SchemaFactory.createForClass(AIChatbotSettings);

// Create indexes
AIChatbotSettingsSchema.index({ setting_id: 1 }, { unique: true });
AIChatbotSettingsSchema.index({ company_id: 1 }, { unique: true });
AIChatbotSettingsSchema.index({ is_active: 1 });
AIChatbotSettingsSchema.index({ enabled_facebook_page_ids: 1 });
