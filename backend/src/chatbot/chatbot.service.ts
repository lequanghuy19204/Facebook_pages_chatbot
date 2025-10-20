import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AIChatbotSettings, AIChatbotSettingsDocument } from '../schemas/ai-chatbot-settings.schema';
import { AITrainingDocument, AITrainingDocumentDocument } from '../schemas/ai-training-document.schema';
import { CreateAISettingsDto, UpdateAISettingsDto, CreateTrainingDocumentDto, UpdateTrainingDocumentDto, QueryTrainingDocumentsDto } from '../dto/chatbot.dto';
import * as crypto from 'crypto';

@Injectable()
export class ChatbotService {
  private readonly ENCRYPTION_KEY: string;
  private readonly ENCRYPTION_IV_LENGTH = 16;

  constructor(
    @InjectModel(AIChatbotSettings.name)
    private aiSettingsModel: Model<AIChatbotSettingsDocument>,
    @InjectModel(AITrainingDocument.name)
    private trainingDocumentModel: Model<AITrainingDocumentDocument>,
  ) {
    // Get encryption key from environment or generate one (in production, use env variable)
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  // ===== ENCRYPTION HELPERS =====
  
  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(this.ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY, 'hex').slice(0, 32),
      iv
    );
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptApiKey(encryptedApiKey: string): string {
    const parts = encryptedApiKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY, 'hex').slice(0, 32),
      iv
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 4) + '***************' + apiKey.substring(apiKey.length - 4);
  }

  // ===== AI SETTINGS METHODS =====

  async getAISettings(companyId: string): Promise<any> {
    const settings = await this.aiSettingsModel.findOne({ company_id: companyId }).exec();
    
    if (!settings) {
      throw new NotFoundException('AI settings not found for this company');
    }

    // Return settings with masked API key
    const settingsObj = settings.toObject();
    return {
      ...settingsObj,
      api_key: this.maskApiKey(settingsObj.api_key),
    };
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

    // Encrypt API key
    const encryptedApiKey = this.encryptApiKey(dto.api_key);

    // Generate setting_id
    const settingId = `ai_setting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new settings
    const newSettings = new this.aiSettingsModel({
      setting_id: settingId,
      company_id: companyId,
      ai_provider: dto.ai_provider,
      ai_model: dto.ai_model,
      api_key: encryptedApiKey,
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
    
    // Return with masked API key
    const settingsObj = savedSettings.toObject();
    return {
      ...settingsObj,
      api_key: this.maskApiKey(dto.api_key),
    };
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
    if (dto.api_key !== undefined) settings.api_key = this.encryptApiKey(dto.api_key);
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
    
    // Return with masked API key
    const settingsObj = updatedSettings.toObject();
    return {
      ...settingsObj,
      api_key: this.maskApiKey(settingsObj.api_key),
    };
  }

  async testConnection(dto: any): Promise<{ success: boolean; message: string }> {
    // TODO: Implement actual API connection test based on provider
    // For now, just validate that API key is provided
    if (!dto.api_key || dto.api_key.length < 10) {
      return {
        success: false,
        message: 'Invalid API key format',
      };
    }

    // Simulate connection test
    return {
      success: true,
      message: 'Connection successful',
    };
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
}
