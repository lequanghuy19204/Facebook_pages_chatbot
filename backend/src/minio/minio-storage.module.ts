import { Module } from '@nestjs/common';
import { MinioStorageService } from './minio-storage.service';
import { MinioStorageController } from './minio-storage.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MinioStorageController],
  providers: [MinioStorageService],
  exports: [MinioStorageService],
})
export class MinioStorageModule {}

