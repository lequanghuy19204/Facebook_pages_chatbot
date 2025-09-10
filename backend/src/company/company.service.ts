import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { UpdateCompanyDto } from '../dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async getCompanyInfo(companyId: string): Promise<any> {
    const company = await this.companyModel.findOne({ company_id: companyId }).exec();
    
    if (!company) {
      throw new NotFoundException('Không tìm thấy thông tin công ty');
    }

    return {
      company_id: company.company_id,
      company_name: company.company_name,
      company_code: company.company_code,
      email: company.email,
      phone: company.phone,
      address: company.address,
      website: company.website,
      settings: company.settings,
      facebook: {
        is_connected: company.facebook.is_connected,
        connected_by: company.facebook.connected_by,
        connected_at: company.facebook.connected_at,
        facebook_user_name: company.facebook.facebook_user_name,
        last_sync: company.facebook.last_sync,
        sync_status: company.facebook.sync_status,
        pages_count: company.facebook.pages_count,
      },
      is_active: company.is_active,
      created_at: company.created_at,
      updated_at: company.updated_at,
    };
  }

  async updateCompanyInfo(companyId: string, updateCompanyDto: UpdateCompanyDto): Promise<any> {
    const company = await this.companyModel.findOne({ company_id: companyId }).exec();
    
    if (!company) {
      throw new NotFoundException('Không tìm thấy thông tin công ty');
    }

    const updateData: any = {};

    if (updateCompanyDto.company_name) {
      updateData.company_name = updateCompanyDto.company_name;
    }

    if (updateCompanyDto.email) {
      updateData.email = updateCompanyDto.email;
    }

    if (updateCompanyDto.phone) {
      updateData.phone = updateCompanyDto.phone;
    }

    if (updateCompanyDto.address) {
      updateData.address = updateCompanyDto.address;
    }

    if (updateCompanyDto.website) {
      updateData.website = updateCompanyDto.website;
    }

    if (updateCompanyDto.settings) {
      if (updateCompanyDto.settings.timezone) {
        updateData['settings.timezone'] = updateCompanyDto.settings.timezone;
      }
      
      if (updateCompanyDto.settings.language) {
        updateData['settings.language'] = updateCompanyDto.settings.language;
      }
      
      if (updateCompanyDto.settings.currency) {
        updateData['settings.currency'] = updateCompanyDto.settings.currency;
      }
      
      if (updateCompanyDto.settings.max_users) {
        updateData['settings.max_users'] = updateCompanyDto.settings.max_users;
      }
    }

    await this.companyModel.updateOne(
      { company_id: companyId },
      { $set: updateData }
    ).exec();

    const updatedCompany = await this.companyModel.findOne({ company_id: companyId }).exec();
    
    if (!updatedCompany) {
      throw new NotFoundException('Không tìm thấy thông tin công ty sau khi cập nhật');
    }

    return {
      success: true,
      message: 'Cập nhật thông tin công ty thành công',
      company: {
        company_id: updatedCompany.company_id,
        company_name: updatedCompany.company_name,
        company_code: updatedCompany.company_code,
        email: updatedCompany.email,
        phone: updatedCompany.phone,
        address: updatedCompany.address,
        website: updatedCompany.website,
        settings: updatedCompany.settings,
      }
    };
  }
}
