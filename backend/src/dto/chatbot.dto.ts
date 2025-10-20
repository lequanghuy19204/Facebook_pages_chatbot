import { IsString, IsBoolean, IsNumber, IsArray, IsOptional, IsEnum, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { AIProvider } from '../schemas/ai-chatbot-settings.schema';

// ===== AI CHATBOT SETTINGS DTOs =====

export class CreateAISettingsDto {
  @IsEnum(AIProvider)
  @IsNotEmpty()
  ai_provider: string;

  @IsString()
  @IsNotEmpty()
  ai_model: string;

  @IsString()
  @IsNotEmpty()
  api_key: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(100)
  @Max(4000)
  @IsOptional()
  max_tokens?: number;

  @IsNumber()
  @Min(0)
  @Max(30)
  @IsOptional()
  response_delay?: number;

  @IsBoolean()
  @IsOptional()
  fallback_enabled?: boolean;

  @IsString()
  @IsNotEmpty()
  system_prompt: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabled_facebook_page_ids?: string[];
}

export class UpdateAISettingsDto {
  @IsEnum(AIProvider)
  @IsOptional()
  ai_provider?: string;

  @IsString()
  @IsOptional()
  ai_model?: string;

  @IsString()
  @IsOptional()
  api_key?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(100)
  @Max(4000)
  @IsOptional()
  max_tokens?: number;

  @IsNumber()
  @Min(0)
  @Max(30)
  @IsOptional()
  response_delay?: number;

  @IsBoolean()
  @IsOptional()
  fallback_enabled?: boolean;

  @IsString()
  @IsOptional()
  system_prompt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabled_facebook_page_ids?: string[];
}

export class TestConnectionDto {
  @IsEnum(AIProvider)
  @IsNotEmpty()
  ai_provider: string;

  @IsString()
  @IsNotEmpty()
  api_key: string;
}

// ===== AI TRAINING DOCUMENTS DTOs =====

export class CreateTrainingDocumentDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class UpdateTrainingDocumentDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  answer?: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class QueryTrainingDocumentsDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
