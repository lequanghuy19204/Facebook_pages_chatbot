import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';

export interface JwtPayload {
  user_id: string;
  company_id: string;
  roles: string[];
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const { user_id, company_id } = payload;

    // Validate user
    const user = await this.userModel.findOne({ 
      user_id, 
      is_active: true 
    }).exec();

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Validate company
    const company = await this.companyModel.findOne({ 
      company_id, 
      is_active: true 
    }).exec();

    if (!company) {
      throw new UnauthorizedException('Company not found or inactive');
    }

    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      company_id: user.company_id,
      is_active: user.is_active,
    };
  }
}
