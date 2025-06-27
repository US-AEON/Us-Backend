import { Body, Controller, Post, UseGuards, Req, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { ProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

// JWT 사용자 정보를 포함하는 Request 타입 확장
interface RequestWithUser extends Request {
  user: {
    uid: string;
  };
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() profileData: ProfileDto,
    @Req() request: RequestWithUser,
  ) {
    const userId = request.user.uid;
    const result = await this.userService.updateProfile(userId, profileData);
    return {
      success: true,
      message: '프로필 정보가 성공적으로 저장되었습니다.',
      data: result
    };
  }
} 