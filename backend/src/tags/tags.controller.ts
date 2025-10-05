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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, QueryTagsDto, AssignTagsDto } from '../dto/tag.dto';

@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ==================== TAGS CRUD ====================

  /**
   * GET /api/tags
   * Lấy danh sách tags
   * Quyền: Tất cả roles
   */
  @Get()
  async getTags(@Request() req, @Query() query: QueryTagsDto) {
    const { company_id } = req.user;
    const result = await this.tagsService.getTags(company_id, query);
    return {
      data: result.tags,
      total: result.total,
      success: true,
    };
  }

  /**
   * GET /api/tags/:tagId
   * Lấy chi tiết tag
   * Quyền: Tất cả roles
   */
  @Get(':tagId')
  async getTagById(@Param('tagId') tagId: string, @Request() req) {
    const { company_id } = req.user;
    return await this.tagsService.getTagById(tagId, company_id);
  }

  /**
   * POST /api/tags
   * Tạo tag mới
   * Quyền: Chỉ admin và manage_user
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() createTagDto: CreateTagDto, @Request() req) {
    const { company_id, user_id } = req.user;
    return await this.tagsService.createTag(createTagDto, company_id, user_id);
  }

  /**
   * PUT /api/tags/:tagId
   * Cập nhật tag
   * Quyền: Chỉ admin và manage_user
   */
  @Put(':tagId')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async updateTag(
    @Param('tagId') tagId: string,
    @Body() updateTagDto: UpdateTagDto,
    @Request() req,
  ) {
    const { company_id } = req.user;
    return await this.tagsService.updateTag(tagId, updateTagDto, company_id);
  }

  /**
   * DELETE /api/tags/:tagId
   * Xóa tag
   * Quyền: Chỉ admin và manage_user
   */
  @Delete(':tagId')
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async deleteTag(@Param('tagId') tagId: string, @Request() req) {
    const { company_id } = req.user;
    return await this.tagsService.deleteTag(tagId, company_id);
  }

  // ==================== CONVERSATION TAGS ====================

  /**
   * POST /api/conversations/:conversationId/tags
   * Gán tags cho conversation
   * Quyền: Tất cả roles
   */
  @Post('conversations/:conversationId/tags')
  async assignTagsToConversation(
    @Param('conversationId') conversationId: string,
    @Body() assignTagsDto: AssignTagsDto,
    @Request() req,
  ) {
    const { company_id } = req.user;
    return await this.tagsService.assignTagsToConversation(
      conversationId,
      assignTagsDto.tag_ids,
      company_id,
    );
  }

  /**
   * DELETE /api/conversations/:conversationId/tags/:tagId
   * Xóa tag khỏi conversation
   * Quyền: Tất cả roles
   */
  @Delete('conversations/:conversationId/tags/:tagId')
  async removeTagFromConversation(
    @Param('conversationId') conversationId: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    const { company_id } = req.user;
    return await this.tagsService.removeTagFromConversation(conversationId, tagId, company_id);
  }

  // ==================== CUSTOMER TAGS ====================

  /**
   * POST /api/customers/:customerId/tags
   * Gán tags cho customer
   * Quyền: Tất cả roles
   */
  @Post('customers/:customerId/tags')
  async assignTagsToCustomer(
    @Param('customerId') customerId: string,
    @Body() assignTagsDto: AssignTagsDto,
    @Request() req,
  ) {
    const { company_id } = req.user;
    return await this.tagsService.assignTagsToCustomer(
      customerId,
      assignTagsDto.tag_ids,
      company_id,
    );
  }

  /**
   * DELETE /api/customers/:customerId/tags/:tagId
   * Xóa tag khỏi customer
   * Quyền: Tất cả roles
   */
  @Delete('customers/:customerId/tags/:tagId')
  async removeTagFromCustomer(
    @Param('customerId') customerId: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    const { company_id } = req.user;
    return await this.tagsService.removeTagFromCustomer(customerId, tagId, company_id);
  }
}
