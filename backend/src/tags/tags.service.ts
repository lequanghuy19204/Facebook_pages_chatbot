import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FacebookTag, FacebookTagDocument } from '../schemas/facebook-tag.schema';
import { FacebookConversation, FacebookConversationDocument } from '../schemas/facebook-conversation.schema';
import { FacebookCustomer, FacebookCustomerDocument } from '../schemas/facebook-customer.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { CreateTagDto, UpdateTagDto, QueryTagsDto } from '../dto/tag.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(FacebookTag.name) private tagModel: Model<FacebookTagDocument>,
    @InjectModel(FacebookConversation.name) private conversationModel: Model<FacebookConversationDocument>,
    @InjectModel(FacebookCustomer.name) private customerModel: Model<FacebookCustomerDocument>,
    @InjectModel(FacebookPage.name) private pageModel: Model<FacebookPageDocument>,
  ) {}

  // ==================== CRUD OPERATIONS ====================

  /**
   * Tạo tag mới
   * Chỉ admin hoặc manage_user có quyền
   */
  async createTag(createTagDto: CreateTagDto, companyId: string, userId: string): Promise<FacebookTag> {
    const { page_ids, tag_name, tag_color, description } = createTagDto;

    // Validate page_ids thuộc company
    const pages = await this.pageModel.find({
      company_id: companyId,
      page_id: { $in: page_ids },
      is_active: true,
    });

    if (pages.length !== page_ids.length) {
      throw new BadRequestException('Một hoặc nhiều page_id không hợp lệ hoặc không thuộc công ty này');
    }

    // Check tag_name duplicate trong company
    const existingTag = await this.tagModel.findOne({
      company_id: companyId,
      tag_name: tag_name,
    });

    if (existingTag) {
      throw new BadRequestException(`Tag "${tag_name}" đã tồn tại trong công ty này`);
    }

    const TagId = `tag_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    // Create new tag
    const tagId = TagId;
    const newTag = new this.tagModel({
      tag_id: tagId,
      company_id: companyId,
      page_ids: page_ids,
      tag_name: tag_name,
      tag_color: tag_color,
      description: description || '',
      usage_count: 0,
      is_active: true,
      created_by: userId,
    });

    return await newTag.save();
  }

  /**
   * Lấy danh sách tags
   * Tất cả roles có thể xem
   */
  async getTags(companyId: string, query: QueryTagsDto): Promise<{ tags: FacebookTag[]; total: number }> {
    const { page_id, search, is_active } = query;

    const filter: any = { company_id: companyId };

    // Filter by page_id
    if (page_id) {
      filter.page_ids = page_id;
    }

    // Filter by is_active
    if (is_active !== undefined) {
      filter.is_active = is_active;
    }

    // Search by tag_name
    if (search) {
      filter.tag_name = { $regex: search, $options: 'i' };
    }

    const tags = await this.tagModel.find(filter).sort({ usage_count: -1, created_at: -1 });
    const total = await this.tagModel.countDocuments(filter);

    return { tags, total };
  }

  /**
   * Lấy chi tiết tag
   */
  async getTagById(tagId: string, companyId: string): Promise<FacebookTag> {
    const tag = await this.tagModel.findOne({
      tag_id: tagId,
      company_id: companyId,
    });

    if (!tag) {
      throw new NotFoundException(`Tag không tồn tại`);
    }

    return tag;
  }

  /**
   * Cập nhật tag
   * Chỉ admin hoặc manage_user có quyền
   */
  async updateTag(tagId: string, updateTagDto: UpdateTagDto, companyId: string): Promise<FacebookTag> {
    const tag = await this.tagModel.findOne({
      tag_id: tagId,
      company_id: companyId,
    });

    if (!tag) {
      throw new NotFoundException(`Tag không tồn tại`);
    }

    // Check tag_name duplicate nếu đổi tên
    if (updateTagDto.tag_name && updateTagDto.tag_name !== tag.tag_name) {
      const existingTag = await this.tagModel.findOne({
        company_id: companyId,
        tag_name: updateTagDto.tag_name,
        tag_id: { $ne: tagId },
      });

      if (existingTag) {
        throw new BadRequestException(`Tag "${updateTagDto.tag_name}" đã tồn tại trong công ty này`);
      }
    }

    // Validate page_ids nếu có update
    if (updateTagDto.page_ids) {
      const pages = await this.pageModel.find({
        company_id: companyId,
        page_id: { $in: updateTagDto.page_ids },
        is_active: true,
      });

      if (pages.length !== updateTagDto.page_ids.length) {
        throw new BadRequestException('Một hoặc nhiều page_id không hợp lệ');
      }
    }

    // Update fields
    if (updateTagDto.page_ids) tag.page_ids = updateTagDto.page_ids;
    if (updateTagDto.tag_name) tag.tag_name = updateTagDto.tag_name;
    if (updateTagDto.tag_color) tag.tag_color = updateTagDto.tag_color;
    if (updateTagDto.description !== undefined) tag.description = updateTagDto.description;
    if (updateTagDto.is_active !== undefined) tag.is_active = updateTagDto.is_active;

    return await tag.save();
  }

  /**
   * Xóa tag
   * Chỉ admin hoặc manage_user có quyền
   * Tự động xóa tag khỏi tất cả conversations và customers
   */
  async deleteTag(tagId: string, companyId: string): Promise<{ message: string; stats: any }> {
    const tag = await this.tagModel.findOne({
      tag_id: tagId,
      company_id: companyId,
    });

    if (!tag) {
      throw new NotFoundException(`Tag không tồn tại`);
    }

    // Xóa tag khỏi conversations
    const conversationsResult = await this.conversationModel.updateMany(
      { company_id: companyId, tags: tagId },
      { $pull: { tags: tagId } }
    );

    // Xóa tag khỏi customers
    const customersResult = await this.customerModel.updateMany(
      { company_id: companyId, tags: tagId },
      { $pull: { tags: tagId } }
    );

    // Delete tag
    await this.tagModel.deleteOne({ tag_id: tagId });

    return {
      message: 'Tag đã được xóa thành công',
      stats: {
        removed_from_conversations: conversationsResult.modifiedCount,
        removed_from_customers: customersResult.modifiedCount,
      },
    };
  }

  // ==================== TAG ASSIGNMENT ====================

  /**
   * Gán tags cho conversation
   * Tất cả roles có thể gán
   */
  async assignTagsToConversation(conversationId: string, tagIds: string[], companyId: string): Promise<FacebookConversation> {
    const conversation = await this.conversationModel.findOne({
      conversation_id: conversationId,
      company_id: companyId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Validate tags exist và thuộc company
    const tags = await this.tagModel.find({
      company_id: companyId,
      tag_id: { $in: tagIds },
      is_active: true,
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Một hoặc nhiều tag không hợp lệ');
    }

    // Validate tags áp dụng cho page của conversation
    const invalidTags = tags.filter(tag => !tag.page_ids.includes(conversation.page_id));
    if (invalidTags.length > 0) {
      throw new BadRequestException(`Tag "${invalidTags[0].tag_name}" không áp dụng cho page này`);
    }

    // Calculate added and removed tags
    const oldTags = conversation.tags || [];
    const addedTags = tagIds.filter(id => !oldTags.includes(id));
    const removedTags = oldTags.filter(id => !tagIds.includes(id));

    // Update conversation
    conversation.tags = tagIds;
    await conversation.save();

    // Update usage_count
    if (addedTags.length > 0) {
      await this.tagModel.updateMany(
        { tag_id: { $in: addedTags } },
        { $inc: { usage_count: 1 } }
      );
    }

    if (removedTags.length > 0) {
      await this.tagModel.updateMany(
        { tag_id: { $in: removedTags } },
        { $inc: { usage_count: -1 } }
      );
    }

    return conversation;
  }

  /**
   * Xóa tag khỏi conversation
   */
  async removeTagFromConversation(conversationId: string, tagId: string, companyId: string): Promise<FacebookConversation> {
    const conversation = await this.conversationModel.findOne({
      conversation_id: conversationId,
      company_id: companyId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    if (!conversation.tags || !conversation.tags.includes(tagId)) {
      throw new BadRequestException('Tag không có trong conversation này');
    }

    // Remove tag
    conversation.tags = conversation.tags.filter(id => id !== tagId);
    await conversation.save();

    // Decrease usage_count
    await this.tagModel.updateOne(
      { tag_id: tagId },
      { $inc: { usage_count: -1 } }
    );

    return conversation;
  }

  /**
   * Gán tags cho customer
   */
  async assignTagsToCustomer(customerId: string, tagIds: string[], companyId: string): Promise<FacebookCustomer> {
    const customer = await this.customerModel.findOne({
      customer_id: customerId,
      company_id: companyId,
    });

    if (!customer) {
      throw new NotFoundException('Customer không tồn tại');
    }

    // Validate tags
    const tags = await this.tagModel.find({
      company_id: companyId,
      tag_id: { $in: tagIds },
      is_active: true,
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Một hoặc nhiều tag không hợp lệ');
    }

    // Validate tags áp dụng cho page của customer
    const invalidTags = tags.filter(tag => !tag.page_ids.includes(customer.page_id));
    if (invalidTags.length > 0) {
      throw new BadRequestException(`Tag "${invalidTags[0].tag_name}" không áp dụng cho page này`);
    }

    // Calculate changes
    const oldTags = customer.tags || [];
    const addedTags = tagIds.filter(id => !oldTags.includes(id));
    const removedTags = oldTags.filter(id => !tagIds.includes(id));

    // Update customer
    customer.tags = tagIds;
    await customer.save();

    // Update usage_count
    if (addedTags.length > 0) {
      await this.tagModel.updateMany(
        { tag_id: { $in: addedTags } },
        { $inc: { usage_count: 1 } }
      );
    }

    if (removedTags.length > 0) {
      await this.tagModel.updateMany(
        { tag_id: { $in: removedTags } },
        { $inc: { usage_count: -1 } }
      );
    }

    return customer;
  }

  /**
   * Xóa tag khỏi customer
   */
  async removeTagFromCustomer(customerId: string, tagId: string, companyId: string): Promise<FacebookCustomer> {
    const customer = await this.customerModel.findOne({
      customer_id: customerId,
      company_id: companyId,
    });

    if (!customer) {
      throw new NotFoundException('Customer không tồn tại');
    }

    if (!customer.tags || !customer.tags.includes(tagId)) {
      throw new BadRequestException('Tag không có trong customer này');
    }

    // Remove tag
    customer.tags = customer.tags.filter(id => id !== tagId);
    await customer.save();

    // Decrease usage_count
    await this.tagModel.updateOne(
      { tag_id: tagId },
      { $inc: { usage_count: -1 } }
    );

    return customer;
  }
}
