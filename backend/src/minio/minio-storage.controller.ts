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
import { MinioStorageService, MinioStorageUploadResult, MinioStorageFileMetadata } from './minio-storage.service';
import { Readable } from 'stream';

@ApiTags('File Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class MinioStorageController {
  private readonly logger = new Logger(MinioStorageController.name);

  constructor(private readonly minioService: MinioStorageService) {}

  @Post('upload/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 10 * 1024 * 1024,
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
  ): Promise<{ success: boolean; data: MinioStorageUploadResult }> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!this.minioService.validateImageFile(file)) {
      throw new BadRequestException('Invalid image file type');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder || `images/${userId}`;
    
    const fileName = customFileName || this.minioService.generateRandomFileName(file.originalname);

    this.logger.log(`User ${userId} uploading image: ${file.originalname} (${file.size} bytes)`);

    const result = await this.minioService.uploadFile(file, uploadFolder, fileName);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 25 * 1024 * 1024,
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
  ): Promise<{ success: boolean; data: MinioStorageUploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder === 'messages' ? this.minioService.generateChatFolder() : (folder || `files/${userId}`);
    
    const fileName = customFileName || this.minioService.generateRandomFileName(file.originalname);

    this.logger.log(`User ${userId} uploading file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

    const result = await this.minioService.uploadFile(file, uploadFolder, fileName);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/files')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  }))
  @ApiOperation({ summary: 'Upload multiple files (max 10, 25MB each)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'Files uploaded successfully',
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
    @Query('folder') folder?: string
  ): Promise<{ success: boolean; data: MinioStorageUploadResult[]; summary: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder === 'messages' ? this.minioService.generateChatFolder() : (folder || `files/${userId}`);
    
    this.logger.log(`User ${userId} uploading ${files.length} files in parallel`);

    // Upload TẤT CẢ files SONG SONG để tăng tốc
    const uploadPromises = files.map(file => 
      this.minioService.uploadFile(file, uploadFolder, this.minioService.generateRandomFileName(file.originalname))
        .catch(error => {
          this.logger.error(`Error uploading ${file.originalname}:`, error);
          return null;
        })
    );

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(r => r !== null) as MinioStorageUploadResult[];

    this.logger.log(`Successfully uploaded ${successfulUploads.length}/${files.length} files`);

    return {
      success: successfulUploads.length > 0,
      data: successfulUploads,
      summary: {
        total: files.length,
        successful: successfulUploads.length,
        failed: files.length - successfulUploads.length,
      },
    };
  }

  @Post('upload/images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 10, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload multiple images (max 10, 25MB each)' })
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
  ): Promise<{ success: boolean; data: MinioStorageUploadResult[]; summary: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    const userId = req.user.user_id;
    const uploadFolder = folder || `images/${userId}`;
    
    this.logger.log(`User ${userId} uploading ${files.length} images`);

    const results: MinioStorageUploadResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        if (!this.minioService.validateImageFile(file)) {
          errors.push(`Invalid image file type: ${file.originalname}`);
          continue;
        }

        const fileName = this.minioService.generateRandomFileName(file.originalname);
        const result = await this.minioService.uploadFile(file, uploadFolder, fileName);
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
  ): Promise<{ success: boolean; data: MinioStorageFileMetadata & { publicUrl: string } }> {
    key = key.includes('/') ? key : decodeURIComponent(key);
    const metadata = await this.minioService.getFileMetadata(key);
    
    return {
      success: true,
      data: {
        ...metadata,
        publicUrl: this.minioService.getPublicUrl(key),
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
    key = key.includes('/') ? key : decodeURIComponent(key);
    const metadata = await this.minioService.getFileMetadata(key);
    
    if (!metadata.exists) {
      throw new BadRequestException('File not found');
    }

    const stream = await this.minioService.getFileStream(key);
    
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
    key = key.includes('/') ? key : decodeURIComponent(key);
    const expiration = expiresIn || 3600;
    const signedUrl = await this.minioService.getSignedUrl(key, expiration);
    
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
    key = key.includes('/') ? key : decodeURIComponent(key);
    const userId = req.user.user_id;
    
    const isAdmin = req.user.roles.includes('admin');
    const isUserFile = key.startsWith(`images/${userId}/`);
    
    if (!isAdmin && !isUserFile) {
      throw new BadRequestException('You can only delete your own files');
    }

    this.logger.log(`User ${userId} deleting file: ${key}`);

    await this.minioService.deleteFile(key);

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
      service: 'MinIO Storage',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}

