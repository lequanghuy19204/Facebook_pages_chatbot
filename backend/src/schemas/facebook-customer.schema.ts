import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookCustomerDocument = FacebookCustomer & Document;

@Schema({ collection: 'facebook_customers' })
export class FacebookCustomer {
  @Prop({ required: true, unique: true, index: true })
  customer_id: string; // Tự sinh unique ID

  @Prop({ required: true, index: true })
  company_id: string; // ID công ty (multi-tenant)

  @Prop({ required: true, index: true })
  page_id: string; // ID Facebook Page

  @Prop({ required: true, unique: true, index: true })
  facebook_user_id: string; // Facebook User ID từ sender.id

  @Prop({ required: true })
  name: string; // Tên khách hàng từ Facebook

  @Prop()
  first_name?: string; // Tên

  @Prop()
  last_name?: string; // Họ

  @Prop()
  profile_pic?: string; // Avatar URL từ Facebook

  @Prop()
  locale?: string; // Ngôn ngữ: "vi_VN", "en_US"

  @Prop()
  timezone?: number; // Múi giờ: +7

  @Prop()
  email?: string; // Email (nếu khách hàng cung cấp trong chat hoặc nhân viên/chatbot thêm)

  @Prop()
  phone?: string; // Số điện thoại (nếu khách hàng cung cấp trong chat hoặc nhân viên/chatbot thêm)

  @Prop()
  address?: string; // Địa chỉ (AI extract từ chat)

  @Prop()
  height?: number; // Chiều cao cm (thường do nhân viên hoặc chatbot thêm)

  @Prop()
  weight?: number; // Cân nặng kg (thường do nhân viên hoặc chatbot thêm)
  
  @Prop({ type: Array })
  purchased_products?: {
    product_id: string;
    product_name: string;
    quantity: number;
    purchase_date: Date;
    notes?: string;
  }[]; // Danh sách sản phẩm đã mua/quan tâm (AI extract từ chat)

  @Prop()
  customer_notes?: string; // Ghi chú quan trọng về khách hàng (AI phân tích hành vi + nhân viên bổ sung)

  @Prop({ type: [String], default: [] })
  tags: string[]; // Mảng tag_id để phân loại customer (VD: ["tag_001", "tag_002"])

  @Prop({ default: 'active' })
  status: 'active' | 'blocked' | 'archived'; // Trạng thái khách hàng

  @Prop({ default: Date.now })
  first_contact_at: Date; // Lần đầu tiên liên hệ

  @Prop({ default: Date.now })
  last_interaction_at: Date; // Tương tác cuối cùng

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;
}

export const FacebookCustomerSchema = SchemaFactory.createForClass(FacebookCustomer);

// Indexes
FacebookCustomerSchema.index({ customer_id: 1 }, { unique: true });
// Một khách hàng Facebook có thể tương tác với nhiều page khác nhau của cùng 1 company
// Nên phải có composite index: company_id + page_id + facebook_user_id
FacebookCustomerSchema.index({ company_id: 1, page_id: 1, facebook_user_id: 1 }, { unique: true });
FacebookCustomerSchema.index({ company_id: 1, page_id: 1 });
FacebookCustomerSchema.index({ company_id: 1, last_interaction_at: -1 });
FacebookCustomerSchema.index({ tags: 1 }); // Find customers by tags
FacebookCustomerSchema.index({ company_id: 1, tags: 1 }); // Filter customers by tags in company
FacebookCustomerSchema.index({ phone: 1 }); // Tìm customer theo phone
FacebookCustomerSchema.index({ company_id: 1, name: 1 }); // Tìm customer theo tên
FacebookCustomerSchema.index({ 'purchased_products.product_id': 1 }); // Tìm customer đã mua sản phẩm