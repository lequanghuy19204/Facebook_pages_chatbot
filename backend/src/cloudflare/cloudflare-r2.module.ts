import { Module } from '@nestjs/common';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { CloudflareR2Controller } from './cloudflare-r2.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CloudflareR2Controller],
  providers: [CloudflareR2Service],
  exports: [CloudflareR2Service],
})
export class CloudflareR2Module {}
