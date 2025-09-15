import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductDocument, ProductImage } from '../schemas/product.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import {
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  UpdateProductImageDto,
  ProductQueryDto,
} from '../dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cloudflareR2Service: CloudflareR2Service,
  ) {}

  /**
   * Tạo sản phẩm mới
   */
  async createProduct(
    createProductDto: CreateProductDto,
    companyId: string,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      
      const existingProduct = await this.productModel.findOne({
        company_id: companyId,
        code: createProductDto.code,
      }).exec();

      if (existingProduct) {
        throw new BadRequestException(`Mã sản phẩm "${createProductDto.code}" đã tồn tại trong công ty`);
      }

      
      const productId = `prod_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

      
      const newProduct = new this.productModel({
        product_id: productId,
        company_id: companyId,
        name: createProductDto.name,
        code: createProductDto.code,
        price: createProductDto.price,
        currency: createProductDto.currency || 'VND',
        colors: createProductDto.colors,
        brand: createProductDto.brand,
        notes: createProductDto.notes,
        images: [],
        is_active: true,
        created_by: userId,
        updated_by: userId,
      });

      const savedProduct = await newProduct.save();
      this.logger.log(`Sản phẩm mới được tạo: ${savedProduct.product_id} bởi user ${userId}`);

      return savedProduct;
    } catch (error) {
      this.logger.error(`Lỗi khi tạo sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy danh sách sản phẩm theo công ty với phân trang và lọc
   */
  async getProducts(companyId: string, queryDto: ProductQueryDto): Promise<{
    products: ProductDocument[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        brand,
        sort_by = 'created_at',
        sort_order = 'desc',
        is_active,
      } = queryDto;

      const skip = (page - 1) * limit;
      const filter: any = { company_id: companyId };

      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
        ];
      }

      if (brand) {
        filter.brand = brand;
      }

      if (is_active !== undefined) {
        filter.is_active = is_active;
      }

      
      const sortOptions: any = {};
      sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;

      
      const products = await this.productModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.productModel.countDocuments(filter);

      return {
        products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết sản phẩm
   */
  async getProductById(productId: string, companyId: string): Promise<ProductDocument> {
    try {
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      return product;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông tin sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin sản phẩm
   */
  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
    companyId: string,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      
      if (updateProductDto.code && updateProductDto.code !== product.code) {
        const existingProduct = await this.productModel.findOne({
          company_id: companyId,
          code: updateProductDto.code,
          product_id: { $ne: productId }, 
        }).exec();

        if (existingProduct) {
          throw new BadRequestException(`Mã sản phẩm "${updateProductDto.code}" đã tồn tại trong công ty`);
        }
      }

      
      const updateData: any = { ...updateProductDto };
      updateData.updated_by = userId;

      const updatedProduct = await this.productModel.findOneAndUpdate(
        { product_id: productId, company_id: companyId },
        { $set: updateData },
        { new: true },
      ).exec();

      if (!updatedProduct) {
        throw new NotFoundException('Không tìm thấy sản phẩm sau khi cập nhật');
      }

      this.logger.log(`Sản phẩm ${productId} được cập nhật bởi user ${userId}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Xóa sản phẩm
   */
  async deleteProduct(productId: string, companyId: string): Promise<{ success: boolean; message: string }> {
    try {
      
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          try {
            await this.cloudflareR2Service.deleteFile(image.cloudflare_key);
            this.logger.log(`Đã xóa ảnh ${image.image_id} từ Cloudflare R2`);
          } catch (error) {
            this.logger.error(`Lỗi khi xóa ảnh ${image.image_id}: ${error.message}`);
            
          }
        }
      }

      
      await this.productModel.deleteOne({ product_id: productId }).exec();
      this.logger.log(`Sản phẩm ${productId} đã bị xóa`);

      return {
        success: true,
        message: 'Sản phẩm đã được xóa thành công',
      };
    } catch (error) {
      this.logger.error(`Lỗi khi xóa sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Thêm ảnh cho sản phẩm
   */
  async addProductImage(
    productId: string,
    imageDto: AddProductImageDto,
    companyId: string,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      
      const imageId = `img_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

      
      const newImage: ProductImage = {
        image_id: imageId,
        cloudflare_url: imageDto.cloudflare_url,
        cloudflare_key: imageDto.cloudflare_key,
        display_order: imageDto.display_order || product.images.length + 1,
        alt_text: imageDto.alt_text || product.name,
        created_at: new Date(),
        created_by: userId,
      };

      
      const updatedProduct = await this.productModel.findOneAndUpdate(
        { product_id: productId, company_id: companyId },
        {
          $push: { images: newImage },
          $set: { updated_by: userId }
        },
        { new: true },
      ).exec();

      if (!updatedProduct) {
        throw new NotFoundException('Không tìm thấy sản phẩm sau khi thêm ảnh');
      }

      this.logger.log(`Ảnh ${imageId} được thêm vào sản phẩm ${productId} bởi user ${userId}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Lỗi khi thêm ảnh cho sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin ảnh sản phẩm
   */
  async updateProductImage(
    productId: string,
    imageDto: UpdateProductImageDto,
    companyId: string,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
        'images.image_id': imageDto.image_id,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm hoặc ảnh');
      }

      
      const updateFields: any = {};
      
      if (imageDto.display_order !== undefined) {
        updateFields['images.$.display_order'] = imageDto.display_order;
      }
      
      if (imageDto.alt_text !== undefined) {
        updateFields['images.$.alt_text'] = imageDto.alt_text;
      }

      
      const setObject = { ...updateFields };
      setObject['updated_by'] = userId;
      
      const updatedProduct = await this.productModel.findOneAndUpdate(
        {
          product_id: productId,
          company_id: companyId,
          'images.image_id': imageDto.image_id,
        },
        {
          $set: setObject,
        },
        { new: true },
      ).exec();

      if (!updatedProduct) {
        throw new NotFoundException('Không tìm thấy sản phẩm hoặc ảnh sau khi cập nhật');
      }

      this.logger.log(`Ảnh ${imageDto.image_id} của sản phẩm ${productId} được cập nhật bởi user ${userId}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật ảnh sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Xóa ảnh sản phẩm
   */
  async deleteProductImage(
    productId: string,
    imageId: string,
    companyId: string,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      
      const product = await this.productModel.findOne({
        product_id: productId,
        company_id: companyId,
        'images.image_id': imageId,
      }).exec();

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm hoặc ảnh');
      }

      
      const image = product.images.find(img => img.image_id === imageId);
      if (!image) {
        throw new NotFoundException('Không tìm thấy ảnh');
      }

      
      try {
        await this.cloudflareR2Service.deleteFile(image.cloudflare_key);
        this.logger.log(`Đã xóa ảnh ${imageId} từ Cloudflare R2`);
      } catch (error) {
        this.logger.error(`Lỗi khi xóa ảnh từ Cloudflare R2: ${error.message}`);
        
      }

      
      const updatedProduct = await this.productModel.findOneAndUpdate(
        { product_id: productId, company_id: companyId },
        {
          $pull: { images: { image_id: imageId } },
          $set: { updated_by: userId }
        },
        { new: true },
      ).exec();

      if (!updatedProduct) {
        throw new NotFoundException('Không tìm thấy sản phẩm sau khi xóa ảnh');
      }

      this.logger.log(`Ảnh ${imageId} của sản phẩm ${productId} đã bị xóa bởi user ${userId}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Lỗi khi xóa ảnh sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy danh sách thương hiệu
   */
  async getBrands(companyId: string): Promise<string[]> {
    try {
      const brands = await this.productModel.distinct('brand', {
        company_id: companyId,
        brand: { $exists: true, $ne: null }
      }).exec();
      
      
      return brands.filter(brand => brand !== '');
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách thương hiệu: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy thống kê sản phẩm
   */
  async getProductStats(companyId: string): Promise<any> {
    try {
      const totalProducts = await this.productModel.countDocuments({
        company_id: companyId,
      });

      const activeProducts = await this.productModel.countDocuments({
        company_id: companyId,
        is_active: true,
      });

      const inactiveProducts = await this.productModel.countDocuments({
        company_id: companyId,
        is_active: false,
      });

      const brandsCount = await this.productModel.aggregate([
        { $match: { company_id: companyId, brand: { $exists: true, $ne: null } } },
        { $match: { brand: { $ne: '' } } },
        { $group: { _id: '$brand' } },
        { $count: 'count' },
      ]).exec();

      const productsWithImages = await this.productModel.countDocuments({
        company_id: companyId,
        'images.0': { $exists: true },
      });

      const productsWithoutImages = await this.productModel.countDocuments({
        company_id: companyId,
        $or: [
          { images: { $exists: false } },
          { images: { $size: 0 } },
        ],
      });

      return {
        total_products: totalProducts,
        active_products: activeProducts,
        inactive_products: inactiveProducts,
        brands_count: brandsCount.length > 0 ? brandsCount[0].count : 0,
        products_with_images: productsWithImages,
        products_without_images: productsWithoutImages,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thống kê sản phẩm: ${error.message}`, error.stack);
      throw error;
    }
  }
}