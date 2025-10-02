import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { FacebookMessagingService } from './facebook-messaging.service';
import { FacebookMessagingController } from './facebook-messaging.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';

import { FacebookCustomer, FacebookCustomerSchema } from '../schemas/facebook-customer.schema';
import { FacebookConversation, FacebookConversationSchema } from '../schemas/facebook-conversation.schema';
import { FacebookMessage, FacebookMessageSchema } from '../schemas/facebook-message.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: FacebookCustomer.name, schema: FacebookCustomerSchema },
      { name: FacebookConversation.name, schema: FacebookConversationSchema },
      { name: FacebookMessage.name, schema: FacebookMessageSchema },
      { name: FacebookPage.name, schema: FacebookPageSchema },
    ]),
  ],
  controllers: [FacebookMessagingController, FacebookWebhookController],
  providers: [FacebookMessagingService],
  exports: [FacebookMessagingService],
})
export class FacebookMessagingModule {}