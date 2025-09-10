import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from '../dto/company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCompanyInfo(@Request() req: any) {
    const { user } = req;
    return this.companyService.getCompanyInfo(user.company_id);
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  async updateCompanyInfo(@Request() req: any, @Body() updateCompanyDto: UpdateCompanyDto) {
    const { user } = req;
    return this.companyService.updateCompanyInfo(user.company_id, updateCompanyDto);
  }
}