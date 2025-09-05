import { Controller, Get, Put, Post, Param, Body, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAllUsers(@Request() req: any, @Query() query: any) {
    const { user } = req;
    
    // Check if user has admin or manage_user role
    if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.MANAGE_USER)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return this.usersService.getAllUsers(user.company_id, query);
  }

  @Get('pending')
  @UseGuards(AuthGuard('jwt'))
  async getPendingUsers(@Request() req: any) {
    const { user } = req;
    
    // Check if user has admin or manage_user role
    if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.MANAGE_USER)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return this.usersService.getPendingUsers(user.company_id);
  }

  @Put(':userId/approve')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async approveUser(@Request() req: any, @Param('userId') userId: string) {
    const { user } = req;
    return this.usersService.approveUser(userId, user.company_id, user.user_id);
  }

  @Put(':userId/reject')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async rejectUser(@Request() req: any, @Param('userId') userId: string) {
    const { user } = req;
    return this.usersService.rejectUser(userId, user.company_id);
  }

  @Put(':userId/roles')
  @UseGuards(AuthGuard('jwt'))
  async updateUserRoles(
    @Request() req: any, 
    @Param('userId') userId: string, 
    @Body() body: { roles: UserRole[] }
  ) {
    const { user } = req;
    
    // Check permissions based on roles
    if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.MANAGE_USER)) {
      throw new ForbiddenException('You do not have permission to update user roles');
    }

    return this.usersService.updateUserRoles(userId, user.company_id, body.roles, user.roles);
  }

  @Put(':userId/status')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async toggleUserStatus(
    @Request() req: any, 
    @Param('userId') userId: string, 
    @Body() body: { is_active: boolean }
  ) {
    const { user } = req;
    return this.usersService.toggleUserStatus(userId, user.company_id, body.is_active);
  }

  @Put(':userId/facebook-pages')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN, UserRole.MANAGE_USER)
  async updateFacebookPagesAccess(
    @Request() req: any, 
    @Param('userId') userId: string, 
    @Body() body: { page_ids: string[] }
  ) {
    const { user } = req;
    return this.usersService.updateFacebookPagesAccess(userId, user.company_id, body.page_ids);
  }

  @Post('heartbeat')
  @UseGuards(AuthGuard('jwt'))
  async sendHeartbeat(@Request() req: any) {
    const { user } = req;
    return this.usersService.updateHeartbeat(user.user_id);
  }
}
