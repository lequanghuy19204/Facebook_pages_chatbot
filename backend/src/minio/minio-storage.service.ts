import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Readable } from 'stream';

export interface MinioStorageUploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface MinioStorageFileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  exists: boolean;
}

@Injectable()
export class MinioStorageService {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'http://localhost:9000';
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin123';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'facebook-chatbot-files';
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL') || endpoint;

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.error('MinIO configuration is incomplete. Please check environment variables.');
      throw new Error('MinIO configuration is incomplete');
    }

    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.logger.log('MinIO storage service initialized successfully');
    this.logger.log(`MinIO endpoint: ${endpoint}, bucket: ${this.bucketName}`);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    customFileName?: string
  ): Promise<MinioStorageUploadResult> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = customFileName 
        ? `${customFileName}${fileExtension}`
        : `${uuidv4()}${fileExtension}`;
      
      const key = `${folder}/${fileName}`;

      this.logger.log(`Uploading file: ${key} (${file.size} bytes)`);

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      const publicUrl = `${this.publicUrl}/${this.bucketName}/${key}`;

      const result: MinioStorageUploadResult = {
        key: key,
        url: publicUrl,
        publicUrl: publicUrl,
        size: file.size,
        contentType: file.mimetype,
        uploadedAt: new Date(),
      };

      this.logger.log(`File uploaded successfully: ${key}`);
      return result;

    } catch (error) {
      this.logger.error('Error uploading file to MinIO:', error);
      throw new InternalServerErrorException('Failed to upload file to MinIO storage');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<MinioStorageUploadResult> {
    try {
      this.logger.log(`Uploading buffer: ${key} (${buffer.length} bytes)`);

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      const publicUrl = `${this.publicUrl}/${this.bucketName}/${key}`;

      const result: MinioStorageUploadResult = {
        key: key,
        url: publicUrl,
        publicUrl: publicUrl,
        size: buffer.length,
        contentType: contentType,
        uploadedAt: new Date(),
      };

      this.logger.log(`Buffer uploaded successfully: ${key}`);
      return result;

    } catch (error) {
      this.logger.error('Error uploading buffer to MinIO:', error);
      throw new InternalServerErrorException('Failed to upload buffer to MinIO storage');
    }
  }

  async getFileMetadata(key: string): Promise<MinioStorageFileMetadata> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(headCommand);

      return {
        key: key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        exists: true,
      };

    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return {
          key: key,
          size: 0,
          contentType: '',
          lastModified: new Date(),
          exists: false,
        };
      }

      this.logger.error('Error getting file metadata:', error);
      throw new InternalServerErrorException('Failed to get file metadata');
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: expiresIn,
      });

      this.logger.log(`Generated signed URL for: ${key}`);
      return signedUrl;

    } catch (error) {
      this.logger.error('Error generating signed URL:', error);
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);
      this.logger.log(`File deleted successfully: ${key}`);
      return true;

    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getFileStream(key: string): Promise<Readable> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(getCommand);
      
      if (!response.Body) {
        throw new BadRequestException('File not found or empty');
      }

      const stream = Readable.from(response.Body as any);
      return stream;

    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new BadRequestException('File not found');
      }

      this.logger.error('Error getting file stream:', error);
      throw new InternalServerErrorException('Failed to get file stream');
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${this.bucketName}/${key}`;
  }

  validateImageFile(file: Express.Multer.File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    return allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension);
  }

  generateImageFileName(originalName: string, prefix: string = 'img'): string {
    const fileExtension = path.extname(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `${prefix}_${timestamp}_${uuid}${fileExtension}`;
  }

  async downloadAndUploadFromUrl(
    sourceUrl: string,
    folder: string,
    customFileName?: string
  ): Promise<MinioStorageUploadResult | null> {
    try {
      this.logger.log(`Downloading file from URL: ${sourceUrl}`);
      
      const axios = (await import('axios')).default;
      const response = await axios.get(sourceUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      
      let fileName = customFileName;
      if (!fileName) {
        const urlPath = new URL(sourceUrl).pathname;
        const urlFileName = path.basename(urlPath);
        fileName = urlFileName || `file_${Date.now()}`;
      }
      
      const fileExtension = path.extname(fileName);
      if (!fileExtension) {
        const ext = contentType.split('/')[1] || 'jpg';
        fileName = `${fileName}.${ext}`;
      }
      
      const timestamp = Date.now();
      const uuid = uuidv4().split('-')[0];
      const finalFileName = `${path.parse(fileName).name}_${timestamp}_${uuid}${path.extname(fileName)}`;
      
      const key = `${folder}/${finalFileName}`;

      this.logger.log(`Uploading to MinIO: ${key} (${buffer.length} bytes)`);

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        Metadata: {
          sourceUrl: sourceUrl,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      const publicUrl = `${this.publicUrl}/${this.bucketName}/${key}`;

      return {
        key: key,
        url: publicUrl,
        publicUrl: publicUrl,
        size: buffer.length,
        contentType: contentType,
        uploadedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to download and upload from URL: ${sourceUrl}`, error);
      return null;
    }
  }

  async downloadAndUploadMultipleFromUrls(
    urls: string[],
    folder: string
  ): Promise<MinioStorageUploadResult[]> {
    if (!urls || urls.length === 0) {
      return [];
    }

    this.logger.log(`Uploading ${urls.length} files from URLs in parallel`);

    const uploadPromises = urls.map(url => 
      this.downloadAndUploadFromUrl(url, folder)
    );

    const results = await Promise.allSettled(uploadPromises);

    const successfulUploads: MinioStorageUploadResult[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulUploads.push(result.value);
      } else {
        this.logger.warn(`Failed to upload file from URL: ${urls[index]}`);
      }
    });

    this.logger.log(`Successfully uploaded ${successfulUploads.length}/${urls.length} files`);

    return successfulUploads;
  }
}

