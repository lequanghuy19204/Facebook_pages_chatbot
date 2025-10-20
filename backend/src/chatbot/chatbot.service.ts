import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AIChatbotSettings, AIChatbotSettingsDocument } from '../schemas/ai-chatbot-settings.schema';
import { AITrainingDocument, AITrainingDocumentDocument } from '../schemas/ai-training-document.schema';
import { CreateAISettingsDto, UpdateAISettingsDto, CreateTrainingDocumentDto, UpdateTrainingDocumentDto, QueryTrainingDocumentsDto } from '../dto/chatbot.dto';
import { MinioStorageService } from '../minio/minio-storage.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly n8nWebhookUrl: string | undefined;

  constructor(
    @InjectModel(AIChatbotSettings.name)
    private aiSettingsModel: Model<AIChatbotSettingsDocument>,
    @InjectModel(AITrainingDocument.name)
    private trainingDocumentModel: Model<AITrainingDocumentDocument>,
    private minioStorageService: MinioStorageService,
    private configService: ConfigService,
  ) {
    this.n8nWebhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
  }

  // ===== API SETTINGS METHODS =====

  async getAISettings(companyId: string): Promise<any> {
    const settings = await this.aiSettingsModel.findOne({ company_id: companyId }).exec();
    
    if (!settings) {
      throw new NotFoundException('AI settings not found for this company');
    }

    // Return settings with full API key (no masking)
    return settings.toObject();
  }

  async createAISettings(
    companyId: string,
    userId: string,
    dto: CreateAISettingsDto,
  ): Promise<any> {
    // Check if settings already exist for this company
    const existingSettings = await this.aiSettingsModel.findOne({ company_id: companyId }).exec();
    if (existingSettings) {
      throw new ConflictException('AI settings already exist for this company. Use update instead.');
    }

    // Generate setting_id
    const settingId = `ai_setting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new settings - store API key directly
    const newSettings = new this.aiSettingsModel({
      setting_id: settingId,
      company_id: companyId,
      ai_provider: dto.ai_provider,
      ai_model: dto.ai_model,
      api_key: dto.api_key, // Store directly without encryption
      is_active: dto.is_active ?? false,
      temperature: dto.temperature ?? 0.7,
      max_tokens: dto.max_tokens ?? 1000,
      response_delay: dto.response_delay ?? 2,
      fallback_enabled: dto.fallback_enabled ?? true,
      system_prompt: dto.system_prompt,
      enabled_facebook_page_ids: dto.enabled_facebook_page_ids ?? [],
      created_by: userId,
      updated_by: userId,
    });

    const savedSettings = await newSettings.save();
    
    // Return with full API key (no masking)
    return savedSettings.toObject();
  }

  async updateAISettings(
    companyId: string,
    userId: string,
    dto: UpdateAISettingsDto,
  ): Promise<any> {
    const settings = await this.aiSettingsModel.findOne({ company_id: companyId }).exec();
    
    if (!settings) {
      throw new NotFoundException('AI settings not found for this company');
    }

    // Update fields
    if (dto.ai_provider !== undefined) settings.ai_provider = dto.ai_provider;
    if (dto.ai_model !== undefined) settings.ai_model = dto.ai_model;
    if (dto.api_key !== undefined) settings.api_key = dto.api_key; // Store directly without encryption
    if (dto.is_active !== undefined) settings.is_active = dto.is_active;
    if (dto.temperature !== undefined) settings.temperature = dto.temperature;
    if (dto.max_tokens !== undefined) settings.max_tokens = dto.max_tokens;
    if (dto.response_delay !== undefined) settings.response_delay = dto.response_delay;
    if (dto.fallback_enabled !== undefined) settings.fallback_enabled = dto.fallback_enabled;
    if (dto.system_prompt !== undefined) settings.system_prompt = dto.system_prompt;
    if (dto.enabled_facebook_page_ids !== undefined) {
      settings.enabled_facebook_page_ids = dto.enabled_facebook_page_ids;
    }
    
    settings.updated_by = userId;

    const updatedSettings = await settings.save();
    
    // Return with full API key (no masking)
    return updatedSettings.toObject();
  }

  async testConnection(companyId: string, dto: any): Promise<{ success: boolean; message: string }> {
    // Validate input
    if (!dto.ai_provider) {
      return {
        success: false,
        message: 'AI provider is required',
      };
    }

    // Check if n8n webhook URL is configured
    if (!this.n8nWebhookUrl) {
      this.logger.error('N8N_WEBHOOK_URL is not configured in environment variables');
      return {
        success: false,
        message: 'Test service is not configured',
      };
    }

    try {
      // Get the API key from database if not provided
      let apiKeyToTest = dto.api_key;
      
      // If API key not provided, get from database
      if (!dto.api_key) {
        const settings = await this.aiSettingsModel.findOne({ company_id: companyId }).exec();
        if (!settings) {
          return {
            success: false,
            message: 'AI settings not found. Please save your settings first.',
          };
        }
        apiKeyToTest = settings.api_key;
        this.logger.log('Using stored API key from database for testing');
      }

      // Validate API key
      if (!apiKeyToTest || apiKeyToTest.length < 10) {
        return {
          success: false,
          message: 'Invalid API key format',
        };
      }

      this.logger.log(`Testing ${dto.ai_provider} API connection via n8n webhook`);

      // Call n8n webhook to test the actual API connection
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ai_provider: dto.ai_provider,
          api_key: apiKeyToTest, // Send the REAL API key to n8n
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.logger.log(`${dto.ai_provider} API connection test successful`);
      } else {
        this.logger.warn(`${dto.ai_provider} API connection test failed: ${result.message}`);
      }

      return result;

    } catch (error) {
      this.logger.error('Error testing connection via n8n webhook:', error);
      return {
        success: false,
        message: 'Failed to test connection: ' + (error.message || 'Unknown error'),
      };
    }
  }

  // ===== TRAINING DOCUMENTS METHODS =====

  async getTrainingDocuments(
    companyId: string,
    query: QueryTrainingDocumentsDto,
  ): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { company_id: companyId };
    
    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      filter.$or = [
        { question: { $regex: query.search, $options: 'i' } },
        { answer: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      this.trainingDocumentModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.trainingDocumentModel.countDocuments(filter).exec(),
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTrainingDocumentById(
    companyId: string,
    documentId: string,
  ): Promise<AITrainingDocumentDocument> {
    const document = await this.trainingDocumentModel
      .findOne({ document_id: documentId, company_id: companyId })
      .exec();

    if (!document) {
      throw new NotFoundException('Training document not found');
    }

    return document;
  }

  async createTrainingDocument(
    companyId: string,
    userId: string,
    dto: CreateTrainingDocumentDto,
  ): Promise<AITrainingDocumentDocument> {
    // Generate document_id
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newDocument = new this.trainingDocumentModel({
      document_id: documentId,
      company_id: companyId,
      category: dto.category,
      question: dto.question,
      answer: dto.answer,
      prompt: dto.prompt,
      images: dto.images ?? [],
      created_by: userId,
      updated_by: userId,
    });

    return await newDocument.save();
  }

  async updateTrainingDocument(
    companyId: string,
    userId: string,
    documentId: string,
    dto: UpdateTrainingDocumentDto,
  ): Promise<AITrainingDocumentDocument> {
    const document = await this.trainingDocumentModel
      .findOne({ document_id: documentId, company_id: companyId })
      .exec();

    if (!document) {
      throw new NotFoundException('Training document not found');
    }

    // Update fields
    if (dto.category !== undefined) document.category = dto.category;
    if (dto.question !== undefined) document.question = dto.question;
    if (dto.answer !== undefined) document.answer = dto.answer;
    if (dto.prompt !== undefined) document.prompt = dto.prompt;
    if (dto.images !== undefined) document.images = dto.images;
    
    document.updated_by = userId;

    return await document.save();
  }

  async deleteTrainingDocument(
    companyId: string,
    documentId: string,
  ): Promise<{ message: string }> {
    const result = await this.trainingDocumentModel
      .deleteOne({ document_id: documentId, company_id: companyId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Training document not found');
    }

    return { message: 'Training document deleted successfully' };
  }

  async uploadTrainingImage(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<{ success: boolean; data: { key: string; url: string; publicUrl: string } }> {
    try {
      // Upload to MinIO with company-specific folder
      const uploadFolder = `training-documents/${companyId}`;
      const result = await this.minioStorageService.uploadFile(file, uploadFolder);

      return {
        success: true,
        data: {
          key: result.key,
          url: result.url,
          publicUrl: result.publicUrl,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload training image: ' + error.message);
    }
  }

  async uploadTrainingImages(
    companyId: string,
    files: Express.Multer.File[],
  ): Promise<{ 
    success: boolean; 
    data: Array<{ key: string; url: string; publicUrl: string; originalName: string }>;
    failed: Array<{ fileName: string; error: string }>;
  }> {
    const uploadFolder = `training-documents/${companyId}`;
    const results: Array<{ key: string; url: string; publicUrl: string; originalName: string }> = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    // Upload tất cả ảnh song song để tăng tốc
    await Promise.allSettled(
      files.map(async (file) => {
        try {
          const result = await this.minioStorageService.uploadFile(file, uploadFolder);
          results.push({
            key: result.key,
            url: result.url,
            publicUrl: result.publicUrl,
            originalName: file.originalname,
          });
        } catch (error) {
          failed.push({
            fileName: file.originalname,
            error: error.message || 'Upload failed',
          });
        }
      })
    );

    return {
      success: true,
      data: results,
      failed: failed,
    };
  }
}
