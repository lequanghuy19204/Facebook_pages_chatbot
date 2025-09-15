import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsBoolean, ValidateNested, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty({ description: 'ID của ảnh' })
  @IsOptional()
  @IsString()
  image_id?: string;

  @ApiProperty({ description: 'URL ảnh trên Cloudflare R2' })
  @IsNotEmpty()
  @IsUrl()
  cloudflare_url: string;

  @ApiProperty({ description: 'Key của ảnh trên Cloudflare R2' })
  @IsNotEmpty()
  @IsString()
  cloudflare_key: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 1 })
  @IsNumber()
  @Min(1)
  display_order: number;

  @ApiProperty({ description: 'Mô tả ảnh', required: false })
  @IsOptional()
  @IsString()
  alt_text?: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mã sản phẩm (unique trong công ty)' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Giá sản phẩm' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Đơn vị tiền tệ', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Các màu sắc có sẵn', type: [String] })
  @IsArray()
  @IsString({ each: true })
  colors: string[];

  @ApiProperty({ description: 'Thương hiệu', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ description: 'Ghi chú về sản phẩm', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Mã sản phẩm (unique trong công ty)', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Giá sản phẩm', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Đơn vị tiền tệ', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Các màu sắc có sẵn', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiProperty({ description: 'Thương hiệu', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ description: 'Ghi chú về sản phẩm', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AddProductImageDto {
  @ApiProperty({ description: 'URL ảnh trên Cloudflare R2' })
  @IsNotEmpty()
  @IsUrl()
  cloudflare_url: string;

  @ApiProperty({ description: 'Key của ảnh trên Cloudflare R2' })
  @IsNotEmpty()
  @IsString()
  cloudflare_key: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 1 })
  @IsNumber()
  @Min(1)
  display_order: number;

  @ApiProperty({ description: 'Mô tả ảnh', required: false })
  @IsOptional()
  @IsString()
  alt_text?: string;
}

export class UpdateProductImageDto {
  @ApiProperty({ description: 'ID của ảnh' })
  @IsNotEmpty()
  @IsString()
  image_id: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  display_order?: number;

  @ApiProperty({ description: 'Mô tả ảnh', required: false })
  @IsOptional()
  @IsString()
  alt_text?: string;
}

export class ProductResponseDto {
  product_id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  colors: string[];
  brand?: string;
  notes?: string;
  images: ProductImageDto[];
  is_active: boolean;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export class ProductsPageResponseDto {
  products: ProductResponseDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class ProductQueryDto {
  @ApiProperty({ description: 'Trang hiện tại', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Số lượng sản phẩm mỗi trang', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: 'Tìm kiếm theo tên hoặc mã sản phẩm', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Lọc theo thương hiệu', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ description: 'Sắp xếp theo trường', required: false, enum: ['name', 'price', 'created_at'], default: 'created_at' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiProperty({ description: 'Thứ tự sắp xếp', required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ description: 'Lọc theo trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
