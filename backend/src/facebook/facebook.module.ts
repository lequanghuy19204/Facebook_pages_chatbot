import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { AuthModule } from '../auth/auth.module';
import { MinioStorageModule } from '../minio/minio-storage.module';
import { Company, CompanySchema } from '../schemas/company.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';

@Module({
  imports: [
    AuthModule,
    MinioStorageModule,
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: FacebookPage.name, schema: FacebookPageSchema }
    ])
  ],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService]
})
export class FacebookModule {}
