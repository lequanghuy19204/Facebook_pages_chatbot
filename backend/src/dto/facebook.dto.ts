import { IsOptional, IsString, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class FacebookConnectDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class FacebookUserInfoDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  picture?: any;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class FacebookPageDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  access_token: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  category_list?: Array<{ id: string; name: string }>;

  @IsOptional()
  @IsNumber()
  fan_count?: number;

  @IsOptional()
  @IsString()
  about?: string;
  
  @IsOptional()
  picture?: {
    data: {
      url: string;
    }
  };
  
  @IsOptional()
  @IsArray()
  tasks?: string[];
}

export class FacebookPagesResponseDto {
  @IsArray()
  data: FacebookPageDto[];

  @IsOptional()
  paging?: any;
}

export class FacebookTokenExchangeDto {
  @IsString()
  access_token: string;

  @IsString()
  token_type: string;

  @IsOptional()
  @IsNumber()
  expires_in?: number;
}

export class FacebookOAuthUrlDto {
  @IsString()
  oauth_url: string;

  @IsString()
  state: string;
}

export class FacebookConnectionStatusDto {
  @IsBoolean()
  is_connected: boolean;

  @IsOptional()
  @IsString()
  connected_by?: string;

  @IsOptional()
  connected_at?: Date;

  @IsOptional()
  @IsString()
  facebook_user_name?: string;

  @IsOptional()
  @IsNumber()
  pages_count?: number;

  @IsOptional()
  last_sync?: Date;

  @IsOptional()
  @IsString()
  sync_status?: string;

  @IsOptional()
  @IsString()
  error_message?: string;
}

export class FacebookPageSyncResultDto {
  @IsNumber()
  pages_synced: number;

  @IsNumber()
  pages_total: number;

  @IsString()
  sync_status: string;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  @IsArray()
  failed_pages?: string[];
}
