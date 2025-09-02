import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary',
    description: 'The image file to upload',
  })
  image: Express.Multer.File;

  @ApiProperty({ 
    description: 'Optional folder path for organizing files',
    required: false,
    example: 'avatars'
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({ 
    description: 'Optional custom filename (without extension)',
    required: false,
    example: 'profile-picture'
  })
  @IsOptional()
  @IsString()
  filename?: string;
}

export class MultipleFileUploadDto {
  @ApiProperty({ 
    type: 'array',
    items: {
      type: 'string',
      format: 'binary'
    },
    description: 'The image files to upload (max 10)',
  })
  images: Express.Multer.File[];

  @ApiProperty({ 
    description: 'Optional folder path for organizing files',
    required: false,
    example: 'gallery'
  })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class SignedUrlRequestDto {
  @ApiProperty({ 
    description: 'Expiration time in seconds',
    required: false,
    minimum: 60,
    maximum: 86400,
    default: 3600,
    example: 3600
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400) // Max 24 hours
  expiresIn?: number;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({
    description: 'Upload result data',
    type: 'object',
    properties: {
      key: { type: 'string', description: 'File key/path in storage' },
      url: { type: 'string', description: 'Direct access URL' },
      publicUrl: { type: 'string', description: 'Public CDN URL' },
      size: { type: 'number', description: 'File size in bytes' },
      contentType: { type: 'string', description: 'MIME type' },
      uploadedAt: { type: 'string', format: 'date-time', description: 'Upload timestamp' },
    },
  })
  data: {
    key: string;
    url: string;
    publicUrl: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  };
}

export class MultipleFileUploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({
    description: 'Array of upload results',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        url: { type: 'string' },
        publicUrl: { type: 'string' },
        size: { type: 'number' },
        contentType: { type: 'string' },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  data: Array<{
    key: string;
    url: string;
    publicUrl: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  }>;

  @ApiProperty({
    description: 'Upload summary',
    type: 'object',
    properties: {
      total: { type: 'number', description: 'Total files processed' },
      successful: { type: 'number', description: 'Successfully uploaded files' },
      failed: { type: 'number', description: 'Failed uploads' },
      errors: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: 'Error messages for failed uploads',
        required: false
      },
    },
  })
  summary: {
    total: number;
    successful: number;
    failed: number;
    errors?: string[];
  };
}

export class FileMetadataResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'File metadata',
    type: 'object',
    properties: {
      key: { type: 'string', description: 'File key/path' },
      size: { type: 'number', description: 'File size in bytes' },
      contentType: { type: 'string', description: 'MIME type' },
      lastModified: { type: 'string', format: 'date-time', description: 'Last modification date' },
      exists: { type: 'boolean', description: 'Whether file exists' },
      publicUrl: { type: 'string', description: 'Public access URL' },
    },
  })
  data: {
    key: string;
    size: number;
    contentType: string;
    lastModified: Date;
    exists: boolean;
    publicUrl: string;
  };
}

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'Signed URL data',
    type: 'object',
    properties: {
      signedUrl: { type: 'string', description: 'Pre-signed URL for file access' },
      expiresIn: { type: 'number', description: 'Expiration time in seconds' },
      expiresAt: { type: 'string', format: 'date-time', description: 'Expiration timestamp' },
    },
  })
  data: {
    signedUrl: string;
    expiresIn: number;
    expiresAt: string;
  };
}

export class DeleteFileResponseDto {
  @ApiProperty({ description: 'Deletion success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
