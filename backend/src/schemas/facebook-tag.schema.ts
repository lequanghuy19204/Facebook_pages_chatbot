import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookTagDocument = FacebookTag & Document;

@Schema({ 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'facebook_tags'
})
export class FacebookTag {
  @Prop({ required: true, unique: true })
  tag_id: string;

  // === MULTI-TENANT ===
  @Prop({ required: true })
  company_id: string;

  @Prop({ type: [String], required: true, default: [] })
  page_ids: string[]; // Mảng page_id - tag có thể dùng chung cho nhiều pages

  // === THÔNG TIN TAG ===
  @Prop({ required: true })
  tag_name: string;

  @Prop({ required: true })
  tag_color: string; // Mã màu hex (VD: #FF5733, #3498DB)

  @Prop()
  description?: string;

  // === THỐNG KÊ ===
  @Prop({ default: 0 })
  usage_count: number; // Số lần tag được sử dụng (tự động tăng/giảm)

  // === TRẠNG THÁI ===
  @Prop({ default: true })
  is_active: boolean;

  // === TIMESTAMPS ===
  @Prop({ required: true })
  created_by: string; // user_id của người tạo tag

  created_at: Date;
  updated_at: Date;
}

export const FacebookTagSchema = SchemaFactory.createForClass(FacebookTag);

// Indexes
FacebookTagSchema.index({ tag_id: 1 }, { unique: true });
FacebookTagSchema.index({ company_id: 1, tag_name: 1 }, { unique: true }); // Tag name unique trong company
FacebookTagSchema.index({ page_ids: 1 }); // Find tags by page (array field)
FacebookTagSchema.index({ company_id: 1, page_ids: 1 }); // Tags of company by specific page
FacebookTagSchema.index({ company_id: 1, is_active: 1 });
FacebookTagSchema.index({ usage_count: -1 }); // Sort by popularity
FacebookTagSchema.index({ created_by: 1 });
