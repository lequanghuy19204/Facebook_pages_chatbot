import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookMessageDocument = FacebookMessage & Document;

@Schema({ collection: 'facebook_messages' })
export class FacebookMessage {
  @Prop({ required: true, unique: true, index: true })
  message_id: string; // ID tin nhắn tự sinh, unique toàn hệ thống

  @Prop({ required: true, index: true })
  company_id: string; // ID công ty

  @Prop({ required: true, index: true })
  facebook_page_id: string; // ID chính thức từ Facebook

  @Prop({ required: true, index: true })
  customer_id: string; // ID khách hàng

  @Prop({ required: true, index: true })
  conversation_id: string; // ID cuộc hội thoại chứa tin nhắn này

  @Prop({ index: true })
  facebook_message_id?: string; // Message ID từ Facebook (null nếu gửi từ hệ thống)

  // MESSAGE CONTENT
  @Prop({ required: true, default: 'text' })
  message_type: 'text' | 'image' | 'video' | 'file' | 'comment' | 'quick_reply' | 'postback';

  @Prop({ required: false, default: '' })
  text: string; // Nội dung văn bản (có thể rỗng nếu chỉ có attachments)

  @Prop({ type: Array })
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'file';
    facebook_url: string;
    minio_url?: string;
    minio_key?: string;
    filename: string;
  }[]; // File đính kèm (nếu có)

  // SENDER INFO
  @Prop({ required: true })
  sender_type: 'customer' | 'chatbot' | 'staff'; // Ai gửi

  @Prop({ required: true })
  sender_id: string; // ID người gửi: customer_id, "chatbot", hoặc user_id

  @Prop()
  sender_name?: string; // Tên hiển thị

  // MESSAGE METADATA
  @Prop({ default: false })
  is_escalation_trigger: boolean; // Tin nhắn này có trigger chuyển từ bot sang nhân viên không

  @Prop()
  escalation_reason?: 'bot_cannot_answer' | 'customer_request'; // Lý do escalation

  @Prop()
  shortcut_used?: string; // Nếu staff dùng shortcut để gửi tin nhắn này (lưu shortcut_id hoặc shortcut_code)

  // DELIVERY STATUS
  @Prop({ default: 'sent' })
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';

  // TIMESTAMPS
  @Prop({ required: true })
  sent_at: Date; // Thời gian gửi (từ Facebook timestamp)

  @Prop({ default: Date.now })
  created_at: Date; // Thời gian lưu vào DB

  @Prop({ default: Date.now })
  updated_at: Date; // Thời gian cập nhật cuối
}

export const FacebookMessageSchema = SchemaFactory.createForClass(FacebookMessage);

// Indexes
FacebookMessageSchema.index({ message_id: 1 }, { unique: true });
FacebookMessageSchema.index({ facebook_message_id: 1 }, { unique: true, sparse: true });
FacebookMessageSchema.index({ conversation_id: 1, sent_at: 1 }); // Messages trong conversation
FacebookMessageSchema.index({ company_id: 1, sender_type: 1 });
FacebookMessageSchema.index({ sender_id: 1, sender_type: 1, sent_at: -1 });
FacebookMessageSchema.index({ is_escalation_trigger: 1 });
FacebookMessageSchema.index({ shortcut_used: 1 });