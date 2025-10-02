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
  page_id: string; // ID Facebook Page

  @Prop({ required: true, index: true })
  customer_id: string; // ID khách hàng

  @Prop({ required: true, index: true })
  conversation_id: string; // ID cuộc hội thoại chứa tin nhắn này

  @Prop({ index: true })
  facebook_message_id?: string; // Message ID từ Facebook (null nếu gửi từ hệ thống)

  // MESSAGE CONTENT
  @Prop({ required: true, default: 'text' })
  message_type: 'text' | 'image' | 'file' | 'quick_reply' | 'postback';

  @Prop({ required: true })
  text: string; // Nội dung văn bản

  @Prop({ type: Array })
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    size?: number;
    name?: string;
  }[]; // File đính kèm (nếu có)

  @Prop({ type: Object })
  quick_reply?: {
    payload: string;
  }; // Quick reply data

  @Prop({ type: Object })
  postback?: {
    payload: string;
    title: string;
  }; // Postback data

  // SENDER INFO
  @Prop({ required: true })
  sender_type: 'customer' | 'chatbot' | 'staff'; // Ai gửi

  @Prop({ required: true })
  sender_id: string; // ID người gửi: customer_id, "chatbot", hoặc user_id

  @Prop()
  sender_name?: string; // Tên hiển thị

  // BOT PROCESSING
  @Prop()
  bot_confidence?: number; // Độ tự tin của bot (0-1), null nếu không phải bot xử lý

  @Prop()
  bot_intent?: string; // Intent nhận diện: "product_inquiry", "greeting", etc

  @Prop({ default: false })
  escalated_to_human: boolean; // Tin nhắn này có trigger escalation không

  // READ STATUS
  @Prop({ default: false })
  is_read: boolean; // Đã đọc hay chưa

  @Prop()
  read_at?: Date; // Thời điểm đọc

  @Prop({ type: [String] })
  read_by?: string[]; // Staff đã đọc (chỉ áp dụng khi sender là customer)

  // DELIVERY STATUS
  @Prop({ default: 'sent' })
  delivery_status: 'sending' | 'sent' | 'delivered' | 'failed';

  @Prop()
  delivery_error?: string; // Lỗi khi gửi (nếu có)

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