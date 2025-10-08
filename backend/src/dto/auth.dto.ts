import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum AccountType {
  ADMIN = 'admin',
  STAFF = 'staff'
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterAdminDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  company_code: string;

  @IsOptional()
  @IsEmail()
  company_email?: string;

  @IsOptional()
  @IsString()
  company_phone?: string;

  @IsOptional()
  @IsString()
  company_address?: string;

  @IsOptional()
  @IsString()
  company_website?: string;
}

export class RegisterStaffDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  company_code: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AuthResponseDto {
  access_token: string;
  user: {
    user_id: string;
    email: string;
    full_name: string;
    roles: string[];
    company_id: string;
    is_active: boolean;
    phone?: string;
    avatar_cloudflare_url?: string;
    avatar_cloudflare_key?: string;
    merged_pages_filter?: string[];
  };
  company: {
    company_id: string;
    company_name: string;
    company_code: string;
  };
}
