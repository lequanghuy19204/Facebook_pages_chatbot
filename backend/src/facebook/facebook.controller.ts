import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FacebookService } from './facebook.service';
import {
  FacebookConnectDto,
  FacebookOAuthUrlDto,
  FacebookConnectionStatusDto,
  FacebookPageSyncResultDto
} from '../dto/facebook.dto';
import { FacebookPage } from '../schemas/facebook-page.schema';

@ApiTags('Facebook Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook')
export class FacebookController {
  private readonly logger = new Logger(FacebookController.name);

  constructor(private readonly facebookService: FacebookService) {}

  @Get('oauth-url')
  @ApiOperation({ summary: 'Generate Facebook OAuth URL' })
  @ApiResponse({ 
    status: 200, 
    description: 'OAuth URL generated successfully',
    type: FacebookOAuthUrlDto
  })
  generateOAuthUrl(): FacebookOAuthUrlDto {
    this.logger.log('Generating Facebook OAuth URL');
    return this.facebookService.generateOAuthUrl();
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect Facebook account (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Facebook connected successfully',
    type: FacebookConnectionStatusDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid code or user not admin' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async connectFacebook(
    @Request() req: any,
    @Body() connectDto: FacebookConnectDto
  ): Promise<FacebookConnectionStatusDto> {
    const userId = req.user.user_id;
    this.logger.log(`Facebook connection request from user: ${userId}`);
    
    return await this.facebookService.connectFacebook(userId, connectDto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Facebook connection status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Connection status retrieved successfully',
    type: FacebookConnectionStatusDto
  })
  async getConnectionStatus(@Request() req: any): Promise<FacebookConnectionStatusDto> {
    const userId = req.user.user_id;
    this.logger.log(`Getting Facebook connection status for user: ${userId}`);
    
    return await this.facebookService.getConnectionStatus(userId);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get Facebook pages accessible to user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pages retrieved successfully',
    type: [FacebookPage]
  })
  async getUserPages(@Request() req: any): Promise<FacebookPage[]> {
    const userId = req.user.user_id;
    this.logger.log(`Getting Facebook pages for user: ${userId}`);
    
    return await this.facebookService.getUserPages(userId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually sync Facebook pages (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pages synced successfully',
    type: FacebookPageSyncResultDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - User not admin or Facebook not connected' })
  async syncPages(@Request() req: any): Promise<FacebookPageSyncResultDto> {
    const userId = req.user.user_id;
    this.logger.log(`Manual sync request from user: ${userId}`);
    
    return await this.facebookService.manualSync(userId);
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Facebook account (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Facebook disconnected successfully'
  })
  @ApiResponse({ status: 400, description: 'Bad request - User not admin' })
  async disconnectFacebook(@Request() req: any): Promise<{ success: boolean; message: string }> {
    const userId = req.user.user_id;
    this.logger.log(`Facebook disconnect request from user: ${userId}`);
    
    return await this.facebookService.disconnectFacebook(userId);
  }

  // Debug endpoints (for development)
  @Get('debug/user-info')
  @ApiOperation({ summary: '[DEBUG] Get Facebook user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  async debugUserInfo(
    @Request() req: any,
    @Query('access_token') accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      return { error: 'access_token query parameter is required' };
    }
    
    this.logger.log(`Debug: Getting user info for token: ${accessToken.substring(0, 20)}...`);
    
    try {
      return await this.facebookService.getUserInfo(accessToken);
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('debug/pages')
  @ApiOperation({ summary: '[DEBUG] Get Facebook pages' })
  @ApiResponse({ status: 200, description: 'Pages retrieved' })
  async debugPages(
    @Request() req: any,
    @Query('access_token') accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      return { error: 'access_token query parameter is required' };
    }
    
    this.logger.log(`Debug: Getting pages for token: ${accessToken.substring(0, 20)}...`);
    
    try {
      return await this.facebookService.getPages(accessToken);
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('debug/token')
  @ApiOperation({ summary: '[DEBUG] Debug access token' })
  @ApiResponse({ status: 200, description: 'Token debug info retrieved' })
  async debugToken(
    @Request() req: any,
    @Query('access_token') accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      return { error: 'access_token query parameter is required' };
    }
    
    this.logger.log(`Debug: Debugging token: ${accessToken.substring(0, 20)}...`);
    
    try {
      return await this.facebookService.debugToken(accessToken);
    } catch (error) {
      return { error: error.message };
    }
  }

  // Health check endpoint
  @Get('health')
  @ApiOperation({ summary: 'Facebook service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): any {
    return {
      service: 'Facebook Integration',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}
