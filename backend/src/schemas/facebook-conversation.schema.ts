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
  facebook_page_id: string; // ID chính thức từ Facebook

  @Prop({ required: true, index: true })
  customer_id: string; // ID khách hàng

  @Prop()
  customer_name?: string; // Tên đầy đủ khách hàng (denormalized từ facebook_customers)

  @Prop()
  customer_first_name?: string; // Tên khách hàng (denormalized từ facebook_customers)

  @Prop()
  customer_profile_pic?: string; // Avatar khách hàng gốc từ Facebook (denormalized từ facebook_customers)

  @Prop()
  customer_profile_pic_url?: string; // Avatar khách hàng trên Minio (denormalized từ facebook_customers)

  @Prop()
  customer_profile_pic_key?: string; // Avatar khách hàng key trên Minio (denormalized từ facebook_customers)

  @Prop()
  customer_phone?: string; // Số điện thoại khách hàng (denormalized từ facebook_customers)

  @Prop()
  page_name?: string; // Tên page (denormalized từ facebook_pages)

  @Prop()
  page_picture?: string; // Avatar page gốc từ Facebook (denormalized từ facebook_pages)

  @Prop()
  page_picture_url?: string; // Avatar page trên Minio (denormalized từ facebook_pages)

  @Prop()
  page_picture_key?: string; // Avatar page key trên Minio (denormalized từ facebook_pages)

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

  // READ STATUS (CHỈ QUAN TÂM KHI CURRENT_HANDLER = "human")
  @Prop({ default: false })
  is_read: boolean; // Nhân viên đã đọc conversation chưa

  @Prop()
  read_by_user_id?: string; // ID nhân viên đọc conversation gần nhất

  @Prop()
  read_by_user_name?: string; // Tên nhân viên đọc conversation gần nhất (để hiển thị cho nhân viên khác)

  @Prop()
  read_at?: Date; // Thời gian nhân viên đọc conversation gần nhất

  // STATS
  @Prop({ default: 0 })
  total_messages: number; // Tổng số tin nhắn

  @Prop({ default: 0 })
  unread_customer_messages: number; // Số tin nhắn từ khách chưa được xử lý

  // ROLLING SUMMARY (Token Optimization)
  @Prop({ default: 0 })
  summary_checkpoint: number; // Số tin nhắn đã được tóm tắt (0, 10, 20, 30, ...)

  @Prop({ default: null })
  current_summary?: string; // Summary hiện tại của các tin nhắn đã qua (null = chưa có summary)

  // ESCALATION (Bot → Human)
  @Prop({ default: false })
  escalated_from_bot: boolean; // Bot có chuyển lên human không

  @Prop()
  escalation_reason?: 'no_answer' | 'customer_request' | 'complex_query'; // Lý do chuyển

  @Prop()
  escalated_at?: Date; // Thời điểm chuyển

  // RETURN TO BOT (Nhân viên → Chatbot)
  @Prop({ default: 0 })
  returned_to_bot_count: number; // Số lần nhân viên cấp lại quyền cho bot

  @Prop()
  last_returned_to_bot_at?: Date; // Thời gian cấp lại quyền gần nhất

  @Prop()
  last_returned_by?: string; // user_id của staff cấp lại quyền

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
  current_handler: 1,
  needs_attention: -1, 
  last_message_at: -1 
}); // Dashboard sorting - KEY INDEX
FacebookConversationSchema.index({ assigned_to: 1, status: 1 });
FacebookConversationSchema.index({ company_id: 1, facebook_page_id: 1, current_handler: 1 });
// Indexes cho comment tracking
FacebookConversationSchema.index({ post_id: 1 }, { sparse: true });
FacebookConversationSchema.index({ comment_id: 1 }, { sparse: true });
FacebookConversationSchema.index({ company_id: 1, source: 1 });
// Indexes cho tags
FacebookConversationSchema.index({ tags: 1 }); // Find conversations by tags
FacebookConversationSchema.index({ company_id: 1, tags: 1 }); // Filter conversations by tags in company
FacebookConversationSchema.index({ customer_id: 1, status: 1 }); // Lấy conversations của customer
FacebookConversationSchema.index({ conversation_id: 1, summary_checkpoint: 1 }); // Summary query optimization