import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export interface ProductImage {
  image_id: string;
  cloudflare_url: string;
  cloudflare_key: string;
  display_order: number;
  alt_text?: string;
  created_at: Date;
  created_by: string;
}

@Schema({ 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'products'
})
export class Product {
  @Prop({ required: true, unique: true })
  product_id: string;

  @Prop({ required: true })
  company_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ required: true, default: 'VND' })
  currency: string;

  @Prop({ type: [String], required: true })
  colors: string[];

  @Prop()
  brand?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Array, default: [] })
  images: ProductImage[];

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  created_by: string;

  @Prop()
  updated_by: string;

  created_at: Date;
  updated_at: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes
ProductSchema.index({ product_id: 1 }, { unique: true });
ProductSchema.index({ company_id: 1, code: 1 }, { unique: true });
ProductSchema.index({ company_id: 1 });
ProductSchema.index({ company_id: 1, name: 1 });
ProductSchema.index({ company_id: 1, brand: 1 });
ProductSchema.index({ created_by: 1 });
ProductSchema.index({ 'images.image_id': 1 });
