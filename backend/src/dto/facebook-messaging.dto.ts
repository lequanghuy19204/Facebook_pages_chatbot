import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'quick_reply'])
  messageType?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];

  @IsOptional()
  quickReply?: any;
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
  @IsString()
  notes?: string;

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
  @IsBoolean()
  needsAttention?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}