import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(FacebookPage.name) private facebookPageModel: Model<FacebookPageDocument>,
    private cloudflareR2Service: CloudflareR2Service,
  ) {}

  async getAllUsers(companyId: string, query?: any): Promise<any> {
    const { search, role, status, facebook, limit = 50, page = 1 } = query || {};
    const skip = (page - 1) * limit;

    const filter: any = { company_id: companyId };
    
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      filter.roles = role;
    }

    if (status === 'online') {
      filter.is_online = true;
    } else if (status === 'offline') {
      filter.is_online = false;
    }

    if (facebook === 'has_fb') {
      filter.facebook_pages_access = { $exists: true, $ne: [] };
    } else if (facebook === 'no_fb') {
      filter.$or = [
        { facebook_pages_access: { $exists: false } },
        { facebook_pages_access: [] },
      ];
    }

    const users = await this.userModel
      .find(filter)
      .select('-password_hash') // Exclude password hash
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const totalUsers = await this.userModel.countDocuments(filter);
    
    const company = await this.companyModel.findOne({ company_id: companyId }).exec();
    const maxUsers = company?.settings?.max_users || 10;

    const activeUsers = await this.userModel.countDocuments({ 
      company_id: companyId, 
      is_active: true 
    });
    
    const inactiveUsers = await this.userModel.countDocuments({ 
      company_id: companyId, 
      is_active: false 
    });
    
    const adminUsers = await this.userModel.countDocuments({ 
      company_id: companyId, 
      roles: UserRole.ADMIN 
    });
    
    const onlineUsers = await this.userModel.countDocuments({ 
      company_id: companyId, 
      is_active: true,
      is_online: true 
    });
    
    const offlineUsers = await this.userModel.countDocuments({ 
      company_id: companyId, 
      is_active: true,
      is_online: false 
    });
    
    const usersWithFacebookPages = await this.userModel.countDocuments({ 
      company_id: companyId, 
      facebook_pages_access: { $exists: true, $ne: [] } 
    });

    const totalFacebookPages = await this.facebookPageModel.countDocuments({ 
      company_id: companyId, 
      is_active: true 
    });
    
    const formattedUsers = await Promise.all(users.map(async user => {
      let facebookPages = 0;
      
      // Admin and manage_user have access to all pages
      if (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.MANAGE_USER)) {
        facebookPages = totalFacebookPages;
      } else {
        // Other roles only have access to specific pages in facebook_pages_access
        facebookPages = user.facebook_pages_access?.length || 0;
      }
      
      return {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        is_active: user.is_active,
        facebook_pages: facebookPages,
        total_facebook_pages: totalFacebookPages,
        last_login: user.last_login,
        created_at: user.created_at,
        avatar_cloudflare_url: user.avatar_cloudflare_url,
        avatar_cloudflare_key: user.avatar_cloudflare_key,
        is_online: user.is_online,
        facebook_pages_access: user.facebook_pages_access || [],
      };
    }));

    return {
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / limit),
      },
      stats: {
        totalUsers,
        maxUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        facebookUsers: usersWithFacebookPages,
        pendingUsers: await this.getPendingUsersCount(companyId),
        onlineUsers,
        offlineUsers,
      }
    };
  }

  async getPendingUsers(companyId: string): Promise<any> {
    const pendingUsers = await this.userModel
      .find({ 
        company_id: companyId, 
        is_active: false,
        created_by: null, // Staff users who registered themselves
      })
      .select('-password_hash')
      .sort({ created_at: -1 })
      .exec();
    
    const companyCode = await this.getCompanyCode(companyId);
    
    return pendingUsers.map(user => ({
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      company_code: companyCode,
      created_at: user.created_at,
      requested_role: user.roles[0], // Typically 'staff' for pending users
    }));
  }

  async getPendingUsersCount(companyId: string): Promise<number> {
    return this.userModel.countDocuments({ 
      company_id: companyId, 
      is_active: false,
      created_by: null, // Staff users who registered themselves
    });
  }

  async approveUser(userId: string, companyId: string, approverId: string): Promise<any> {
    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId,
      is_active: false,
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found or already approved');
    }

    // Update user
    await this.userModel.updateOne(
      { user_id: userId },
      { 
        is_active: true,
        created_by: approverId,
      }
    );

    return {
      success: true,
      message: 'User approved successfully',
    };
  }

  async rejectUser(userId: string, companyId: string): Promise<any> {
    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId,
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user
    await this.userModel.deleteOne({ user_id: userId });

    // Decrement current_users in company
    await this.companyModel.updateOne(
      { company_id: companyId },
      { $inc: { 'settings.current_users': -1 } }
    );

    return {
      success: true,
      message: 'User rejected successfully',
    };
  }

  async updateUserRoles(
    userId: string, 
    companyId: string, 
    newRoles: UserRole[], 
    currentUserRoles: string[]
  ): Promise<any> {
    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId,
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if trying to update admin
    if (user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Cannot modify admin roles');
    }

    // Check if trying to grant admin role
    if (newRoles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Cannot grant admin role');
    }

    // Check if manage_user is trying to grant manage_user role
    if (
      !currentUserRoles.includes(UserRole.ADMIN) && 
      newRoles.includes(UserRole.MANAGE_USER)
    ) {
      throw new ForbiddenException('Only admins can grant manage_user role');
    }

    // Update user roles
    await this.userModel.updateOne(
      { user_id: userId },
      { roles: newRoles }
    );

    return {
      success: true,
      message: 'User roles updated successfully',
      roles: newRoles,
    };
  }

  async toggleUserStatus(userId: string, companyId: string, isActive: boolean): Promise<any> {
    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId,
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if trying to deactivate admin
    if (user.roles.includes(UserRole.ADMIN) && !isActive) {
      throw new ForbiddenException('Cannot deactivate admin users');
    }

    // Update user status
    await this.userModel.updateOne(
      { user_id: userId },
      { is_active: isActive }
    );

    return {
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      is_active: isActive,
    };
  }

  async updateFacebookPagesAccess(userId: string, companyId: string, pageIds: string[]): Promise<any> {
    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId,
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update Facebook pages access
    await this.userModel.updateOne(
      { user_id: userId },
      { facebook_pages_access: pageIds }
    );

    return {
      success: true,
      message: 'Facebook pages access updated successfully',
      facebook_pages_access: pageIds,
    };
  }

  private async getCompanyCode(companyId: string): Promise<string> {
    const company = await this.companyModel.findOne({ company_id: companyId }).exec();
    return company?.company_code || '';
  }

  async updateProfile(userId: string, data: { full_name?: string; phone?: string }): Promise<{ success: boolean; message: string; user: any }> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      const updateData: any = {};
      
      if (data.full_name) {
        updateData.full_name = data.full_name;
      }
      
      if (data.phone !== undefined) {
        updateData.phone = data.phone;
      }
      
      await this.userModel.updateOne(
        { user_id: userId },
        { $set: updateData }
      );
      
      const updatedUser = await this.userModel.findOne({ user_id: userId })
        .select('-password_hash')
        .exec();
      
      return {
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }
  
  async changePassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await this.userModel.updateOne(
        { user_id: userId },
        { password_hash: passwordHash }
      );
      
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async updateHeartbeat(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Update user's last_login and is_online status
      await this.userModel.updateOne(
        { user_id: userId },
        { 
          last_login: new Date(),
          is_online: true 
        }
      );

      const threeMinutesAgo = new Date(Date.now() - 1.5 * 60 * 1000);
      await this.userModel.updateMany(
        { 
          last_login: { $lt: threeMinutesAgo },
          is_online: true
        },
        { is_online: false }
      );

      return {
        success: true,
        message: 'Heartbeat received successfully',
      };
    } catch (error) {
      console.error('Heartbeat update error:', error);
      return {
        success: false,
        message: 'Failed to update heartbeat',
      };
    }
  }

  async updateAvatar(userId: string, avatarUrl: string, avatarKey: string): Promise<{ success: boolean; message: string; user: any }> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Xóa avatar cũ từ Cloudflare R2 nếu có
      if (user.avatar_cloudflare_key) {
        try {
          await this.cloudflareR2Service.deleteFile(user.avatar_cloudflare_key);
          console.log(`Deleted old avatar: ${user.avatar_cloudflare_key}`);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
          // Không throw error để không block việc upload avatar mới
        }
      }
      
      // Cập nhật avatar mới
      await this.userModel.updateOne(
        { user_id: userId },
        { 
          $set: { 
            avatar_cloudflare_url: avatarUrl,
            avatar_cloudflare_key: avatarKey
          }
        }
      );
      
      const updatedUser = await this.userModel.findOne({ user_id: userId })
        .select('-password_hash')
        .exec();
      
      return {
        success: true,
        message: 'Avatar updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      console.error('Avatar update error:', error);
      throw error;
    }
  }

  /**
   * Cập nhật merged_pages_filter cho user
   * CHỈ user có thể update của chính mình - Admin KHÔNG có quyền sửa
   */
  async updateMergedPagesFilter(
    userId: string, 
    mergedPagesFilter: string[], 
    companyId: string,
    requestingUserId: string,
    requestingUserRoles: UserRole[]
  ): Promise<any> {
    // Chỉ user mới có thể update của chính mình - Admin KHÔNG có quyền
    if (userId !== requestingUserId) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật bộ lọc pages của chính mình');
    }

    // Find user
    const user = await this.userModel.findOne({ 
      user_id: userId, 
      company_id: companyId 
    }).exec();

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Nếu merged_pages_filter rỗng, cho phép (hiển thị tất cả)
    if (mergedPagesFilter.length === 0) {
      user.merged_pages_filter = [];
      await user.save();
      
      return {
        success: true,
        message: 'Bộ lọc pages đã được cập nhật (hiển thị tất cả)',
        merged_pages_filter: [],
      };
    }

    // Validate: Pages trong merged_pages_filter phải nằm trong facebook_pages_access
    // Admin/manage_user có full access nên check toàn bộ pages của company
    const isAdmin = requestingUserRoles.includes(UserRole.ADMIN);
    const isManageUser = requestingUserRoles.includes(UserRole.MANAGE_USER);
    const hasFullAccess = isAdmin || isManageUser;

    if (hasFullAccess) {
      // Admin/manage_user: Validate pages tồn tại và thuộc company
      const pages = await this.facebookPageModel.find({
        company_id: companyId,
        page_id: { $in: mergedPagesFilter },
        is_active: true,
      }).exec();

      if (pages.length !== mergedPagesFilter.length) {
        throw new BadRequestException('Một hoặc nhiều page_id không hợp lệ hoặc không thuộc công ty này');
      }
    } else {
      // Staff: Check pages trong merged_pages_filter phải nằm trong facebook_pages_access
      const allowedPages = user.facebook_pages_access || [];
      const invalidPages = mergedPagesFilter.filter(pageId => !allowedPages.includes(pageId));
      
      if (invalidPages.length > 0) {
        throw new BadRequestException(
          `Một số pages không nằm trong quyền truy cập của bạn: ${invalidPages.join(', ')}`
        );
      }
    }

    // Update merged_pages_filter
    user.merged_pages_filter = mergedPagesFilter;
    await user.save();

    return {
      success: true,
      message: 'Bộ lọc pages đã được cập nhật',
      merged_pages_filter: mergedPagesFilter,
    };
  }
}
