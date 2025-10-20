import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AIChatbotSettings, AIChatbotSettingsSchema } from '../schemas/ai-chatbot-settings.schema';
import { AITrainingDocument, AITrainingDocumentSchema } from '../schemas/ai-training-document.schema';
import { MinioStorageService } from '../minio/minio-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AIChatbotSettings.name, schema: AIChatbotSettingsSchema },
      { name: AITrainingDocument.name, schema: AITrainingDocumentSchema },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, MinioStorageService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
