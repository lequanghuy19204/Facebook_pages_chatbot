import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from '../schemas/product.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import { AuthModule } from '../auth/auth.module';
import { MinioStorageModule } from '../minio/minio-storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    AuthModule,
    MinioStorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
