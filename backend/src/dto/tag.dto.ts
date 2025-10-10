import { IsString, IsArray, IsOptional, IsBoolean, Matches, ArrayMinSize } from 'class-validator';

// DTO để tạo tag mới
export class CreateTagDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'facebook_page_ids phải chứa ít nhất 1 page' })
  @IsString({ each: true })
  facebook_page_ids: string[]; // Mảng facebook_page_id - tag áp dụng cho các pages này

  @IsString()
  tag_name: string; // Tên tag

  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'tag_color phải là mã màu hex hợp lệ (VD: #FF5733)' })
  tag_color: string; // Mã màu hex

  @IsOptional()
  @IsString()
  description?: string; // Mô tả tag
}

// DTO để cập nhật tag
export class UpdateTagDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'facebook_page_ids phải chứa ít nhất 1 page' })
  @IsString({ each: true })
  facebook_page_ids?: string[];

  @IsOptional()
  @IsString()
  tag_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'tag_color phải là mã màu hex hợp lệ (VD: #FF5733)' })
  tag_color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// DTO để gán tags cho conversation/customer
export class AssignTagsDto {
  @IsArray()
  @IsString({ each: true })
  tag_ids: string[]; // Mảng tag_id cần gán
}

// DTO để query tags
export class QueryTagsDto {
  @IsOptional()
  @IsString()
  facebook_page_id?: string; // Filter tags theo page

  @IsOptional()
  @IsString()
  search?: string; // Tìm kiếm theo tên tag

  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // Filter tags active/inactive
}
