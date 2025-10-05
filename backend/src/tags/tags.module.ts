import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { FacebookTag, FacebookTagSchema } from '../schemas/facebook-tag.schema';
import { FacebookConversation, FacebookConversationSchema } from '../schemas/facebook-conversation.schema';
import { FacebookCustomer, FacebookCustomerSchema } from '../schemas/facebook-customer.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FacebookTag.name, schema: FacebookTagSchema },
      { name: FacebookConversation.name, schema: FacebookConversationSchema },
      { name: FacebookCustomer.name, schema: FacebookCustomerSchema },
      { name: FacebookPage.name, schema: FacebookPageSchema },
    ]),
    AuthModule,
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
