import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { FacebookModule } from './facebook/facebook.module';
import { FacebookMessagingModule } from './facebook-messaging/facebook-messaging.module';
import { CloudflareR2Module } from './cloudflare/cloudflare-r2.module';
import { UsersModule } from './users/users.module';
import { CompanyModule } from './company/company.module';
import { ProductsModule } from './products/products.module';
import { WebsocketModule } from './websocket/websocket.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    FacebookModule,
    FacebookMessagingModule,
    CloudflareR2Module,
    UsersModule,
    CompanyModule,
    ProductsModule,
    WebsocketModule,
    TagsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
