import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

export class CompanySettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  max_users?: number;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  company_name?: string;

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
  website?: string;

  @IsOptional()
  @IsObject()
  settings?: CompanySettingsDto;
}

export class CompanyResponseDto {
  company_id: string;
  company_name: string;
  company_code: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  settings: {
    timezone: string;
    language: string;
    currency: string;
    max_users: number;
    current_users: number;
  };
  facebook: {
    is_connected: boolean;
    connected_by?: string;
    connected_at?: Date;
    facebook_user_name?: string;
    last_sync?: Date;
    sync_status: string;
    pages_count: number;
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
