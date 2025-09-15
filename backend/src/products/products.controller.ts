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
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { UserRole } from '../schemas/user.schema';
import {
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  UpdateProductImageDto,
  ProductQueryDto,
} from '../dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * Kiểm tra quyền quản lý sản phẩm
   */
  private checkProductsPermission(user: any) {
    if (
      !user.roles.includes(UserRole.ADMIN) &&
      !user.roles.includes(UserRole.MANAGE_PRODUCTS)
    ) {
      throw new ForbiddenException('Bạn không có quyền quản lý sản phẩm');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiResponse({ status: 201, description: 'Sản phẩm đã được tạo thành công' })
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang tạo sản phẩm mới`);
    
    return this.productsService.createProduct(
      createProductDto,
      req.user.company_id,
      req.user.user_id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm' })
  async getProducts(@Query() query: ProductQueryDto, @Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang lấy danh sách sản phẩm`);
    
    return this.productsService.getProducts(req.user.company_id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê sản phẩm' })
  @ApiResponse({ status: 200, description: 'Thống kê sản phẩm' })
  async getProductStats(@Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang lấy thống kê sản phẩm`);
    
    return this.productsService.getProductStats(req.user.company_id);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Lấy danh sách thương hiệu' })
  @ApiResponse({ status: 200, description: 'Danh sách thương hiệu' })
  async getBrands(@Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang lấy danh sách thương hiệu`);
    
    return this.productsService.getBrands(req.user.company_id);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết sản phẩm' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết sản phẩm' })
  async getProductById(@Param('productId') productId: string, @Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang lấy thông tin sản phẩm ${productId}`);
    
    return this.productsService.getProductById(productId, req.user.company_id);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm' })
  @ApiResponse({ status: 200, description: 'Sản phẩm đã được cập nhật thành công' })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: any,
  ) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang cập nhật sản phẩm ${productId}`);
    
    return this.productsService.updateProduct(
      productId,
      updateProductDto,
      req.user.company_id,
      req.user.user_id,
    );
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @ApiResponse({ status: 200, description: 'Sản phẩm đã được xóa thành công' })
  async deleteProduct(@Param('productId') productId: string, @Request() req: any) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang xóa sản phẩm ${productId}`);
    
    return this.productsService.deleteProduct(productId, req.user.company_id);
  }

  @Post(':productId/images')
  @ApiOperation({ summary: 'Thêm ảnh cho sản phẩm' })
  @ApiResponse({ status: 201, description: 'Ảnh đã được thêm thành công' })
  async addProductImage(
    @Param('productId') productId: string,
    @Body() imageDto: AddProductImageDto,
    @Request() req: any,
  ) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang thêm ảnh cho sản phẩm ${productId}`);
    
    return this.productsService.addProductImage(
      productId,
      imageDto,
      req.user.company_id,
      req.user.user_id,
    );
  }

  @Put(':productId/images/:imageId')
  @ApiOperation({ summary: 'Cập nhật thông tin ảnh sản phẩm' })
  @ApiResponse({ status: 200, description: 'Thông tin ảnh đã được cập nhật thành công' })
  async updateProductImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() imageDto: UpdateProductImageDto,
    @Request() req: any,
  ) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang cập nhật ảnh ${imageId} của sản phẩm ${productId}`);
    
    
    const updatedDto: UpdateProductImageDto = {
      ...imageDto,
      image_id: imageId,
    };
    
    return this.productsService.updateProductImage(
      productId,
      updatedDto,
      req.user.company_id,
      req.user.user_id,
    );
  }

  @Delete(':productId/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm' })
  @ApiResponse({ status: 200, description: 'Ảnh đã được xóa thành công' })
  async deleteProductImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
  ) {
    this.checkProductsPermission(req.user);
    this.logger.log(`User ${req.user.user_id} đang xóa ảnh ${imageId} của sản phẩm ${productId}`);
    
    return this.productsService.deleteProductImage(
      productId,
      imageId,
      req.user.company_id,
      req.user.user_id,
    );
  }
}