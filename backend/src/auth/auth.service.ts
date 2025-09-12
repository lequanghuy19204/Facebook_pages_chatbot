import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { LoginDto, RegisterAdminDto, RegisterStaffDto, AuthResponseDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private jwtService: JwtService,
  ) {}

  // Tạo company_id và user_id duy nhất
  private generateCompanyId(): string {
    return `comp_${uuidv4().substring(0, 8)}`;
  }

  private generateUserId(): string {
    return `usr_${uuidv4().substring(0, 8)}`;
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Tạo JWT token
  private generateJwtToken(user: UserDocument, company: CompanyDocument): string {
    const payload = {
      user_id: user.user_id,
      company_id: user.company_id,
      roles: user.roles,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  // Đăng ký Admin (tạo công ty mới)
  async registerAdmin(registerAdminDto: RegisterAdminDto): Promise<AuthResponseDto> {
    const { email, password, full_name, company_name, company_code, ...companyData } = registerAdminDto;

    // Kiểm tra company_code đã tồn tại chưa
    const existingCompany = await this.companyModel.findOne({ 
      company_code: company_code.toUpperCase() 
    }).exec();
    
    if (existingCompany) {
      throw new ConflictException('Mã công ty đã tồn tại');
    }

    // Tạo company_id và user_id
    const companyId = this.generateCompanyId();
    const userId = this.generateUserId();

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Tạo company record
    const company = new this.companyModel({
      company_id: companyId,
      company_name,
      company_code: company_code.toUpperCase(),
      email: companyData.company_email,
      phone: companyData.company_phone,
      address: companyData.company_address,
      website: companyData.company_website,
      settings: {
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
        currency: 'VND',
        max_users: 10,
        current_users: 1,
      },
      is_active: true,
      owner_id: userId,
    });

    // Tạo admin user
    const user = new this.userModel({
      user_id: userId,
      email,
      password_hash: passwordHash,
      full_name,
      company_id: companyId,
      phone: null,
      avatar_cloudflare_url: null,
      avatar_cloudflare_key: null,
      roles: [UserRole.ADMIN],
      is_active: true,
      is_online: false,
      created_by: null, // Admin tự đăng ký
    });

    // Lưu cả company và user
    await company.save();
    await user.save();

    // Tạo JWT token
    const accessToken = this.generateJwtToken(user, company);

    return {
      access_token: accessToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        roles: user.roles,
        company_id: user.company_id,
        is_active: user.is_active,
        phone: user.phone,
        avatar_cloudflare_url: user.avatar_cloudflare_url,
        avatar_cloudflare_key: user.avatar_cloudflare_key,
      },
      company: {
        company_id: company.company_id,
        company_name: company.company_name,
        company_code: company.company_code,
      },
    };
  }

  // Đăng ký Staff (vào công ty có sẵn)
  async registerStaff(registerStaffDto: RegisterStaffDto): Promise<{ message: string }> {
    const { email, password, full_name, company_code, phone } = registerStaffDto;

    // Tìm company theo company_code
    const company = await this.companyModel.findOne({ 
      company_code: company_code.toUpperCase(),
      is_active: true 
    }).exec();

    if (!company) {
      throw new BadRequestException('Không tìm thấy công ty với mã này');
    }

    // Kiểm tra giới hạn số lượng user
    if (company.settings.current_users >= company.settings.max_users) {
      throw new BadRequestException('Công ty đã đạt giới hạn số lượng người dùng');
    }

    // Kiểm tra email đã tồn tại trong company chưa
    const existingUser = await this.userModel.findOne({ 
      email, 
      company_id: company.company_id 
    }).exec();

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng trong công ty này');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Tạo staff user
    const userId = this.generateUserId();
    const user = new this.userModel({
      user_id: userId,
      email,
      password_hash: passwordHash,
      full_name,
      company_id: company.company_id,
      phone: phone || null,
      avatar_cloudflare_url: null,
      avatar_cloudflare_key: null,
      roles: [UserRole.STAFF],
      is_active: false, // Chờ admin duyệt
      is_online: false,
      created_by: null, // Sẽ được cập nhật khi admin duyệt
    });

    await user.save();

    // Tăng current_users trong company
    await this.companyModel.updateOne(
      { company_id: company.company_id },
      { $inc: { 'settings.current_users': 1 } }
    );

    return {
      message: 'Đăng ký thành công. Vui lòng chờ admin duyệt tài khoản.',
    };
  }

  // Đăng nhập
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Tìm user active theo email
    const user = await this.userModel.findOne({ 
      email, 
      is_active: true 
    }).exec();

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Validate company
    const company = await this.companyModel.findOne({ 
      company_id: user.company_id, 
      is_active: true 
    }).exec();

    if (!company) {
      throw new UnauthorizedException('Công ty của bạn đã bị tạm ngưng');
    }

    // Cập nhật last_login và is_online
    await this.userModel.updateOne(
      { user_id: user.user_id },
      { 
        last_login: new Date(),
        is_online: true 
      }
    );

    // Tạo JWT token
    const accessToken = this.generateJwtToken(user, company);

    return {
      access_token: accessToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        roles: user.roles,
        company_id: user.company_id,
        is_active: user.is_active,
        phone: user.phone,
        avatar_cloudflare_url: user.avatar_cloudflare_url,
        avatar_cloudflare_key: user.avatar_cloudflare_key,
      },
      company: {
        company_id: company.company_id,
        company_name: company.company_name,
        company_code: company.company_code,
      },
    };
  }

  // Đăng xuất
  async logout(userId: string): Promise<{ message: string }> {
    await this.userModel.updateOne(
      { user_id: userId },
      { is_online: false }
    );

    return {
      message: 'Đăng xuất thành công',
    };
  }
}
