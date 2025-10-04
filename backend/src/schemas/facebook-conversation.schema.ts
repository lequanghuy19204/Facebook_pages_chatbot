import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookConversationDocument = FacebookConversation & Document;

@Schema({ collection: 'facebook_conversations' })
export class FacebookConversation {
  @Prop({ required: true, unique: true, index: true })
  conversation_id: string; // Tự sinh unique ID

  @Prop({ required: true, index: true })
  company_id: string; // ID công ty (multi-tenant)

  @Prop({ required: true, index: true })
  page_id: string; // ID Facebook Page

  @Prop({ required: true, index: true })
  customer_id: string; // ID khách hàng

  @Prop({ unique: true, index: true })
  facebook_thread_id?: string; // Thread ID từ Facebook (nếu có)

  @Prop({ required: true, default: 'messenger' })
  source: 'messenger' | 'comment'; // Nguồn cuộc hội thoại

  // === THÔNG TIN BÀI ĐĂNG (CHIẾ ÁP DỤNG KHI SOURCE = 'comment') ===
  @Prop()
  post_id?: string; // ID bài đăng Facebook (ví dụ: "811762138677249_122105180283009857")

  @Prop()
  comment_id?: string; // ID comment gốc Facebook (ví dụ: "122105180283009857_4218811035025361")

  @Prop()
  post_content?: string; // Nội dung bài đăng

  @Prop()
  post_permalink_url?: string; // Link bài đăng

  @Prop({ type: [String] })
  post_photos?: string[]; // Danh sách ảnh trong bài đăng

  @Prop()
  post_status_type?: string; // Loại bài đăng: "added_photos", "mobile_status_update", etc

  @Prop()
  post_created_time?: Date; // Thời gian tạo bài đăng

  @Prop()
  post_updated_time?: Date; // Thời gian cập nhật bài đăng cuối

  @Prop()
  post_is_published?: boolean; // Bài đăng đã được publish chưa

  @Prop()
  post_promotion_status?: string; // Trạng thái quảng cáo: "inactive", "active"

  @Prop({ default: 'open' })
  status: 'open' | 'closed' | 'archived'; // Trạng thái cuộc hội thoại

  @Prop({ default: 'chatbot' })
  current_handler: 'chatbot' | 'human'; // Ai đang xử lý

  @Prop()
  assigned_to?: string; // ID staff được assign

  @Prop({ default: false })
  needs_attention: boolean; // Cần chú ý (tô đậm trên dashboard)

  @Prop({ default: 'normal' })
  priority: 'low' | 'normal' | 'high' | 'urgent'; // Độ ưu tiên

  @Prop({ type: [String] })
  tags?: string[]; // Tags cho conversation: ["vip", "potential", "complaint", "P. lê", "Huyền", "KCGM"]

  @Prop()
  assigned_at?: Date; // Thời điểm assign staff

  // LAST MESSAGE (For Dashboard Preview)
  @Prop()
  last_message_text?: string; // 100 ký tự đầu để hiển thị preview

  @Prop()
  last_message_at?: Date; // Thời gian tin nhắn cuối

  @Prop()
  last_message_from?: 'customer' | 'chatbot' | 'staff'; // Ai gửi

  // STATS
  @Prop({ default: 0 })
  total_messages: number; // Tổng số tin nhắn

  @Prop({ default: 0 })
  unread_count: number; // Số tin nhắn khách chưa đọc

  // ESCALATION (Bot → Human)
  @Prop({ default: false })
  escalated_from_bot: boolean; // Bot có chuyển lên human không

  @Prop()
  escalation_reason?: 'no_answer' | 'customer_request' | 'complex_query'; // Lý do chuyển

  @Prop()
  escalated_at?: Date; // Thời điểm chuyển

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;
}

export const FacebookConversationSchema = SchemaFactory.createForClass(FacebookConversation);

// Indexes
FacebookConversationSchema.index({ conversation_id: 1 }, { unique: true });
FacebookConversationSchema.index({ facebook_thread_id: 1 }, { unique: true, sparse: true });
FacebookConversationSchema.index({ 
  company_id: 1, 
  needs_attention: -1, 
  last_message_at: -1 
}); // Dashboard sorting - KEY INDEX
FacebookConversationSchema.index({ company_id: 1, assigned_to: 1, status: 1 });
FacebookConversationSchema.index({ company_id: 1, current_handler: 1 });
// Indexes cho comment tracking
FacebookConversationSchema.index({ post_id: 1 }, { sparse: true });
FacebookConversationSchema.index({ comment_id: 1 }, { sparse: true });
FacebookConversationSchema.index({ company_id: 1, source: 1 });