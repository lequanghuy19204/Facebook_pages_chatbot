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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
  async testConnection(@Request() req, @Body() dto: TestConnectionDto) {
    const companyId = req.user.company_id;
    return this.chatbotService.testConnection(companyId, dto);
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

  @Post('training-documents/upload-images')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  @UseInterceptors(FilesInterceptor('images', 10, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  async uploadTrainingImages(
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    return this.chatbotService.uploadTrainingImages(
      req.user.company_id,
      files,
    );
  }

  @Post('sync-rag')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_CHATBOT)
  async syncRagDocuments(@Request() req) {
    return this.chatbotService.syncRagDocuments(req.user.company_id);
  }
}
