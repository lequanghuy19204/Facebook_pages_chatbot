import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudflareR2Service, UploadResult, FileMetadata } from './cloudflare-r2.service';
import { Readable } from 'stream';

@ApiTags('File Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class CloudflareR2Controller {
  private readonly logger = new Logger(CloudflareR2Controller.name);

  constructor(private readonly r2Service: CloudflareR2Service) {}

  @Post('upload/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
      },
    },
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Query('folder') folder?: string,
    @Query('filename') customFileName?: string
  ): Promise<{ success: boolean; data: UploadResult }> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Validate image file
    if (!this.r2Service.validateImageFile(file)) {
      throw new BadRequestException('Invalid image file type');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder || `images/${userId}`;
    
    // Generate filename if not provided
    const fileName = customFileName || this.r2Service.generateImageFileName(file.originalname);

    this.logger.log(`User ${userId} uploading image: ${file.originalname} (${file.size} bytes)`);

    const result = await this.r2Service.uploadFile(file, uploadFolder, fileName);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for general files
    },
  }))
  @ApiOperation({ summary: 'Upload any file (images, videos, documents)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Query('folder') folder?: string,
    @Query('filename') customFileName?: string
  ): Promise<{ success: boolean; data: UploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder || `files/${userId}`;
    
    // Generate filename if not provided
    const fileName = customFileName || file.originalname;

    this.logger.log(`User ${userId} uploading file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

    const result = await this.r2Service.uploadFile(file, uploadFolder, fileName);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 10, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload multiple images (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
          },
        },
      },
    },
  })
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
    @Query('folder') folder?: string
  ): Promise<{ success: boolean; data: UploadResult[]; summary: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder || `images/${userId}`;
    
    this.logger.log(`User ${userId} uploading ${files.length} images`);

    const results: UploadResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate each image file
        if (!this.r2Service.validateImageFile(file)) {
          errors.push(`Invalid image file type: ${file.originalname}`);
          continue;
        }

        const fileName = this.r2Service.generateImageFileName(file.originalname);
        const result = await this.r2Service.uploadFile(file, uploadFolder, fileName);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error uploading ${file.originalname}:`, error);
        errors.push(`Failed to upload ${file.originalname}: ${error.message}`);
      }
    }

    return {
      success: results.length > 0,
      data: results,
      summary: {
        total: files.length,
        successful: results.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  @Get('file/:key')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({ 
    status: 200, 
    description: 'File metadata retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            size: { type: 'number' },
            contentType: { type: 'string' },
            lastModified: { type: 'string', format: 'date-time' },
            exists: { type: 'boolean' },
            publicUrl: { type: 'string' },
          },
        },
      },
    },
  })
  async getFileMetadata(
    @Param('key') key: string
  ): Promise<{ success: boolean; data: FileMetadata & { publicUrl: string } }> {
    // Handle paths with slashes
    key = key.includes('/') ? key : decodeURIComponent(key);
    const metadata = await this.r2Service.getFileMetadata(key);
    
    return {
      success: true,
      data: {
        ...metadata,
        publicUrl: this.r2Service.getPublicUrl(key),
      },
    };
  }

  @Get('download/:key')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ 
    status: 200, 
    description: 'File downloaded successfully',
  })
  async downloadFile(
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    // Handle paths with slashes
    key = key.includes('/') ? key : decodeURIComponent(key);
    const metadata = await this.r2Service.getFileMetadata(key);
    
    if (!metadata.exists) {
      throw new BadRequestException('File not found');
    }

    const stream = await this.r2Service.getFileStream(key);
    
    // Set appropriate headers
    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.size.toString(),
      'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
    });

    return new StreamableFile(stream);
  }

  @Get('signed-url/:key')
  @ApiOperation({ summary: 'Get signed URL for private file access' })
  @ApiResponse({ 
    status: 200, 
    description: 'Signed URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            signedUrl: { type: 'string' },
            expiresIn: { type: 'number' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async getSignedUrl(
    @Param('key') key: string,
    @Query('expiresIn') expiresIn?: number
  ): Promise<{ success: boolean; data: any }> {
    // Handle paths with slashes
    key = key.includes('/') ? key : decodeURIComponent(key);
    const expiration = expiresIn || 3600; // Default 1 hour
    const signedUrl = await this.r2Service.getSignedUrl(key, expiration);
    
    return {
      success: true,
      data: {
        signedUrl,
        expiresIn: expiration,
        expiresAt: new Date(Date.now() + expiration * 1000).toISOString(),
      },
    };
  }

  @Delete('file/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ 
    status: 200, 
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async deleteFile(
    @Param('key') key: string,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    // Handle paths with slashes
    key = key.includes('/') ? key : decodeURIComponent(key);
    const userId = req.user.user_id;
    
    // Check if user has permission to delete this file
    // (files in their own folder or if they're admin)
    const isAdmin = req.user.roles.includes('admin');
    const isUserFile = key.startsWith(`images/${userId}/`);
    
    if (!isAdmin && !isUserFile) {
      throw new BadRequestException('You can only delete your own files');
    }

    this.logger.log(`User ${userId} deleting file: ${key}`);

    await this.r2Service.deleteFile(key);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Storage service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): any {
    return {
      service: 'Cloudflare R2 Storage',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
