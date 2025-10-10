import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookPageDocument = FacebookPage & Document;

@Schema({ 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'facebook_pages'
})
export class FacebookPage {
  @Prop({ required: true, unique: true })
  page_id: string;

  @Prop({ required: true })
  company_id: string;

  @Prop({ required: true, unique: true })
  facebook_page_id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  category?: string;

  @Prop()
  category_list?: Array<{ id: string; name: string }>;

  @Prop({ required: true })
  access_token: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  last_sync?: Date;

  @Prop({ default: 'success' })
  sync_status: string; // 'success', 'error', 'pending'

  @Prop()
  error_message?: string;

  @Prop()
  picture?: string; // URL gốc từ Facebook

  @Prop()
  picture_url?: string; // URL trên MinIO

  @Prop()
  picture_key?: string; // Key trên MinIO

  @Prop()
  tasks?: string[];

  @Prop({ required: true })
  imported_by: string;

  @Prop()
  imported_at?: Date;

  created_at: Date;
  updated_at: Date;
}

export const FacebookPageSchema = SchemaFactory.createForClass(FacebookPage);

// Indexes
FacebookPageSchema.index({ page_id: 1 }, { unique: true });
FacebookPageSchema.index({ facebook_page_id: 1 }, { unique: true });
FacebookPageSchema.index({ company_id: 1, is_active: 1 });
FacebookPageSchema.index({ company_id: 1, sync_status: 1 });
FacebookPageSchema.index({ imported_by: 1 });
