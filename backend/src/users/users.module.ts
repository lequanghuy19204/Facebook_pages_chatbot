import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { AuthModule } from '../auth/auth.module';
import { MinioStorageModule } from '../minio/minio-storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: FacebookPage.name, schema: FacebookPageSchema },
    ]),
    AuthModule,
    MinioStorageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
