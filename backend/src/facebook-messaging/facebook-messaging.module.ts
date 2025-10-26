import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { FacebookMessagingService } from './facebook-messaging.service';
import { FacebookMessagingController } from './facebook-messaging.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';
import { ChatbotWebhookHandlerService } from './chatbot-webhook-handler.service';

import { FacebookCustomer, FacebookCustomerSchema } from '../schemas/facebook-customer.schema';
import { FacebookConversation, FacebookConversationSchema } from '../schemas/facebook-conversation.schema';
import { FacebookMessage, FacebookMessageSchema } from '../schemas/facebook-message.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { AIChatbotSettings, AIChatbotSettingsSchema } from '../schemas/ai-chatbot-settings.schema';
import { WebsocketModule } from '../websocket/websocket.module';
import { MinioStorageService } from '../minio/minio-storage.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: FacebookCustomer.name, schema: FacebookCustomerSchema },
      { name: FacebookConversation.name, schema: FacebookConversationSchema },
      { name: FacebookMessage.name, schema: FacebookMessageSchema },
      { name: FacebookPage.name, schema: FacebookPageSchema },
      { name: AIChatbotSettings.name, schema: AIChatbotSettingsSchema },
    ]),
    WebsocketModule,
  ],
  controllers: [FacebookMessagingController, FacebookWebhookController],
  providers: [
    FacebookMessagingService,
    MinioStorageService,
    ChatbotWebhookHandlerService,
  ],
  exports: [FacebookMessagingService, ChatbotWebhookHandlerService],
})
export class FacebookMessagingModule {}