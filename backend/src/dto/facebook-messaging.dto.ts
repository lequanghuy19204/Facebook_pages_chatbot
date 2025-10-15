import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PostDataDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  permalink_url?: string;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  status_type?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  created_time?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updated_time?: Date;
}

export class CreateConversationWithPostDto {
  @IsString()
  companyId: string;

  @IsString()
  pageId: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  facebookThreadId?: string;

  @IsEnum(['messenger', 'comment'])
  source: 'messenger' | 'comment';

  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostDataDto)
  postData?: PostDataDto;
}

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'quick_reply', 'comment'])
  messageType?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];

  @IsOptional()
  quickReply?: any;
}

export class MessageAttachmentDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  facebook_url?: string;

  @IsOptional()
  @IsString()
  minio_url?: string;

  @IsOptional()
  @IsString()
  minio_key?: string;

  @IsString()
  filename: string;
}

export class ReplyMessageDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'video', 'quick_reply', 'comment'])
  messageType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(['open', 'closed', 'archived'])
  status?: string;

  @IsOptional()
  @IsEnum(['chatbot', 'human'])
  currentHandler?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsBoolean()
  needsAttention?: boolean;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  customer_notes?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(['active', 'blocked', 'archived'])
  status?: string;
}

export class AssignConversationDto {
  @IsString()
  assignedTo: string;
}

export class GetConversationsQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  handler?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  needsAttention?: boolean;

  @IsOptional()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(['messenger', 'comment'])
  source?: 'messenger' | 'comment';

  @IsOptional()
  @IsString()
  facebookPageId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  facebookPageIds?: string[];

  @IsOptional()
  hasPhone?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}