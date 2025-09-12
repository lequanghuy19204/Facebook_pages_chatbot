import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  MANAGE_USER = 'manage_user',
  MANAGE_PRODUCTS = 'manage_products',
  MANAGE_CHATBOT = 'manage_chatbot',
  MANAGE_FACEBOOK_PAGES = 'manage_facebook_pages'
}

@Schema({ 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'users'
})
export class User {
  @Prop({ required: true, unique: true })
  user_id: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({ required: true })
  full_name: string;

  @Prop({ required: true })
  company_id: string;

  @Prop()
  avatar_cloudflare_url?: string;

  @Prop()
  avatar_cloudflare_key?: string;

  @Prop()
  phone?: string;

  @Prop({ 
    type: [String], 
    enum: Object.values(UserRole),
    default: [UserRole.STAFF]
  })
  roles: UserRole[];

  @Prop({ type: [String], default: [] })
  facebook_pages_access: string[];

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_online: boolean;

  @Prop()
  last_login?: Date;

  @Prop()
  created_by?: string;

  created_at: Date;
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ user_id: 1 }, { unique: true });
UserSchema.index({ email: 1, company_id: 1 }, { unique: true });
UserSchema.index({ company_id: 1, is_active: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ company_id: 1, roles: 1 });
UserSchema.index({ email: 1, is_active: 1 });
UserSchema.index({ facebook_pages_access: 1 });
