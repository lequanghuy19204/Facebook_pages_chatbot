import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'companies'
})
export class Company {
  @Prop({ required: true, unique: true })
  company_id: string;

  @Prop({ required: true })
  company_name: string;

  @Prop({ required: true, unique: true, uppercase: true })
  company_code: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  website?: string;

  @Prop({
    type: {
      timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
      language: { type: String, default: 'vi' },
      currency: { type: String, default: 'VND' },
      max_users: { type: Number, default: 10 },
      current_users: { type: Number, default: 1 }
    },
    default: {}
  })
  settings: {
    timezone: string;
    language: string;
    currency: string;
    max_users: number;
    current_users: number;
  };

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  owner_id: string;

  created_at: Date;
  updated_at: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Indexes
CompanySchema.index({ company_id: 1 }, { unique: true });
CompanySchema.index({ company_code: 1 }, { unique: true });
CompanySchema.index({ owner_id: 1 });
CompanySchema.index({ is_active: 1 });
