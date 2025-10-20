import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import {
  CreateAISettingsDto,
  UpdateAISettingsDto,
  TestConnectionDto,
  CreateTrainingDocumentDto,
  UpdateTrainingDocumentDto,
  QueryTrainingDocumentsDto,
} from '../dto/chatbot.dto';

@Controller('chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // ===== AI SETTINGS ENDPOINTS =====

  @Get('ai-settings')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async getAISettings(@Request() req) {
    return this.chatbotService.getAISettings(req.user.company_id);
  }

  @Post('ai-settings')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async createAISettings(@Request() req, @Body() dto: CreateAISettingsDto) {
    return this.chatbotService.createAISettings(
      req.user.company_id,
      req.user.user_id,
      dto,
    );
  }

  @Put('ai-settings')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async updateAISettings(@Request() req, @Body() dto: UpdateAISettingsDto) {
    return this.chatbotService.updateAISettings(
      req.user.company_id,
      req.user.user_id,
      dto,
    );
  }

  @Post('ai-settings/test-connection')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async testConnection(@Body() dto: TestConnectionDto) {
    return this.chatbotService.testConnection(dto);
  }

  // ===== TRAINING DOCUMENTS ENDPOINTS =====

  @Get('training-documents')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async getTrainingDocuments(
    @Request() req,
    @Query() query: QueryTrainingDocumentsDto,
  ) {
    return this.chatbotService.getTrainingDocuments(req.user.company_id, query);
  }

  @Get('training-documents/:documentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async getTrainingDocumentById(
    @Request() req,
    @Param('documentId') documentId: string,
  ) {
    return this.chatbotService.getTrainingDocumentById(
      req.user.company_id,
      documentId,
    );
  }

  @Post('training-documents')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async createTrainingDocument(
    @Request() req,
    @Body() dto: CreateTrainingDocumentDto,
  ) {
    return this.chatbotService.createTrainingDocument(
      req.user.company_id,
      req.user.user_id,
      dto,
    );
  }

  @Put('training-documents/:documentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async updateTrainingDocument(
    @Request() req,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateTrainingDocumentDto,
  ) {
    return this.chatbotService.updateTrainingDocument(
      req.user.company_id,
      req.user.user_id,
      documentId,
      dto,
    );
  }

  @Delete('training-documents/:documentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async deleteTrainingDocument(
    @Request() req,
    @Param('documentId') documentId: string,
  ) {
    return this.chatbotService.deleteTrainingDocument(
      req.user.company_id,
      documentId,
    );
  }
}
