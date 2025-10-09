// import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { v4 as uuidv4 } from 'uuid';
// import * as path from 'path';
// import { Readable } from 'stream';

// export interface UploadResult {
//   key: string;
//   url: string;
//   publicUrl: string;
//   size: number;
//   contentType: string;
//   uploadedAt: Date;
// }

// export interface FileMetadata {
//   key: string;
//   size: number;
//   contentType: string;
//   lastModified: Date;
//   exists: boolean;
// }

// @Injectable()
// export class CloudflareR2Service {
//   private readonly logger = new Logger(CloudflareR2Service.name);
//   private readonly s3Client: S3Client;
//   private readonly bucketName: string;
//   private readonly publicUrl: string;

//   constructor(private configService: ConfigService) {
//     const accountId = this.configService.get<string>('R2_ACCOUNT_ID') || '';
//     const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
//     const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
//     this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
//     const endpoint = this.configService.get<string>('R2_ENDPOINT') || '';
//     this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

//     if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName || !endpoint) {
//       this.logger.error('Cloudflare R2 configuration is incomplete. Please check environment variables.');
//       throw new Error('Cloudflare R2 configuration is incomplete');
//     }

//     // Initialize S3 client with Cloudflare R2 endpoint
//     this.s3Client = new S3Client({
//       region: 'auto', // Cloudflare R2 uses 'auto' region
//       endpoint: endpoint,
//       credentials: {
//         accessKeyId: accessKeyId,
//         secretAccessKey: secretAccessKey,
//       },
//       forcePathStyle: true, // Required for R2
//     });

//     this.logger.log('Cloudflare R2 service initialized successfully');
//   }

//   /**
//    * Upload file to Cloudflare R2
//    */
//   async uploadFile(
//     file: Express.Multer.File,
//     folder: string = 'uploads',
//     customFileName?: string
//   ): Promise<UploadResult> {
//     try {
//       // Generate unique filename
//       const fileExtension = path.extname(file.originalname);
//       const fileName = customFileName 
//         ? `${customFileName}${fileExtension}`
//         : `${uuidv4()}${fileExtension}`;
      
//       const key = `${folder}/${fileName}`;

//       this.logger.log(`Uploading file: ${key} (${file.size} bytes)`);

//       // Upload to R2
//       const uploadCommand = new PutObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//         Body: file.buffer,
//         ContentType: file.mimetype,
//         ContentLength: file.size,
//         Metadata: {
//           originalName: file.originalname,
//           uploadedAt: new Date().toISOString(),
//         },
//       });

//       await this.s3Client.send(uploadCommand);

//       const result: UploadResult = {
//         key: key,
//         url: `https://${this.bucketName}.${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${key}`,
//         publicUrl: this.publicUrl ? `${this.publicUrl}/${key}` : `https://${this.bucketName}.${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${key}`,
//         size: file.size,
//         contentType: file.mimetype,
//         uploadedAt: new Date(),
//       };

//       this.logger.log(`File uploaded successfully: ${key}`);
//       return result;

//     } catch (error) {
//       this.logger.error('Error uploading file to R2:', error);
//       throw new InternalServerErrorException('Failed to upload file to cloud storage');
//     }
//   }

//   /**
//    * Upload buffer to Cloudflare R2
//    */
//   async uploadBuffer(
//     buffer: Buffer,
//     key: string,
//     contentType: string = 'application/octet-stream'
//   ): Promise<UploadResult> {
//     try {
//       this.logger.log(`Uploading buffer: ${key} (${buffer.length} bytes)`);

//       const uploadCommand = new PutObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//         Body: buffer,
//         ContentType: contentType,
//         ContentLength: buffer.length,
//         Metadata: {
//           uploadedAt: new Date().toISOString(),
//         },
//       });

//       await this.s3Client.send(uploadCommand);

//       const result: UploadResult = {
//         key: key,
//         url: `https://${this.bucketName}.${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${key}`,
//         publicUrl: this.publicUrl ? `${this.publicUrl}/${key}` : `https://${this.bucketName}.${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${key}`,
//         size: buffer.length,
//         contentType: contentType,
//         uploadedAt: new Date(),
//       };

//       this.logger.log(`Buffer uploaded successfully: ${key}`);
//       return result;

//     } catch (error) {
//       this.logger.error('Error uploading buffer to R2:', error);
//       throw new InternalServerErrorException('Failed to upload buffer to cloud storage');
//     }
//   }

//   /**
//    * Get file metadata
//    */
//   async getFileMetadata(key: string): Promise<FileMetadata> {
//     try {
//       const headCommand = new HeadObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//       });

//       const response = await this.s3Client.send(headCommand);

//       return {
//         key: key,
//         size: response.ContentLength || 0,
//         contentType: response.ContentType || 'application/octet-stream',
//         lastModified: response.LastModified || new Date(),
//         exists: true,
//       };

//     } catch (error: any) {
//       if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
//         return {
//           key: key,
//           size: 0,
//           contentType: '',
//           lastModified: new Date(),
//           exists: false,
//         };
//       }

//       this.logger.error('Error getting file metadata:', error);
//       throw new InternalServerErrorException('Failed to get file metadata');
//     }
//   }

//   /**
//    * Get signed URL for file access (if needed for private files)
//    */
//   async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
//     try {
//       const getCommand = new GetObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//       });

//       const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
//         expiresIn: expiresIn, // Default 1 hour
//       });

//       this.logger.log(`Generated signed URL for: ${key}`);
//       return signedUrl;

//     } catch (error) {
//       this.logger.error('Error generating signed URL:', error);
//       throw new InternalServerErrorException('Failed to generate signed URL');
//     }
//   }

//   /**
//    * Delete file from R2
//    */
//   async deleteFile(key: string): Promise<boolean> {
//     try {
//       const deleteCommand = new DeleteObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//       });

//       await this.s3Client.send(deleteCommand);
//       this.logger.log(`File deleted successfully: ${key}`);
//       return true;

//     } catch (error) {
//       this.logger.error('Error deleting file:', error);
//       throw new InternalServerErrorException('Failed to delete file');
//     }
//   }

//   /**
//    * Get file stream (for reading files)
//    */
//   async getFileStream(key: string): Promise<Readable> {
//     try {
//       const getCommand = new GetObjectCommand({
//         Bucket: this.bucketName,
//         Key: key,
//       });

//       const response = await this.s3Client.send(getCommand);
      
//       if (!response.Body) {
//         throw new BadRequestException('File not found or empty');
//       }

//       // Convert AWS SDK v3 response body to Node.js Readable stream
//       const stream = Readable.from(response.Body as any);
//       return stream;

//     } catch (error: any) {
//       if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
//         throw new BadRequestException('File not found');
//       }

//       this.logger.error('Error getting file stream:', error);
//       throw new InternalServerErrorException('Failed to get file stream');
//     }
//   }

//   /**
//    * Get public URL for a file
//    */
//   getPublicUrl(key: string): string {
//     if (this.publicUrl) {
//       return `${this.publicUrl}/${key}`;
//     }
//     return `https://${this.bucketName}.${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${key}`;
//   }

//   /**
//    * Validate file type for images
//    */
//   validateImageFile(file: Express.Multer.File): boolean {
//     const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
//     const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
//     const fileExtension = path.extname(file.originalname).toLowerCase();
    
//     return allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension);
//   }

//   /**
//    * Generate unique filename for images
//    */
//   generateImageFileName(originalName: string, prefix: string = 'img'): string {
//     const fileExtension = path.extname(originalName);
//     const timestamp = Date.now();
//     const uuid = uuidv4().split('-')[0]; // Short UUID
//     return `${prefix}_${timestamp}_${uuid}${fileExtension}`;
//   }
// }
