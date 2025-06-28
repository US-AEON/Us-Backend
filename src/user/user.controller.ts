import { Body, Controller, UseGuards, Req, HttpCode, HttpStatus, Put, Patch, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { ProfileDto } from './dto/profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// JWT 사용자 정보를 포함하는 Request 타입 확장
interface RequestWithUser extends Request {
  user: {
    uid: string;
  };
}

@ApiTags('사용자')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '사용자 프로필 조회', description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '프로필 조회 성공',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'user123',
        },
        name: {
          type: 'string',
          example: '홍길동',
        },
        birthYear: {
          type: 'number',
          example: 1990,
        },
        nationality: {
          type: 'string',
          example: '대한민국',
        },
        currentCity: {
          type: 'string',
          example: '서울',
        },
        mainLanguage: {
          type: 'string',
          example: '한국어',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '프로필을 찾을 수 없음' })
  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@Req() request: RequestWithUser) {
    const userId = request.user.uid;
    return await this.userService.getUserProfile(userId);
  }

  @ApiOperation({ summary: '프로필 전체 업데이트', description: '사용자 프로필 정보를 전체 업데이트합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '프로필 업데이트 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '프로필 정보가 성공적으로 저장되었습니다.',
        },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'user123',
            },
            name: {
              type: 'string',
              example: '홍길동',
            },
            birthYear: {
              type: 'number',
              example: 1990,
            },
            nationality: {
              type: 'string',
              example: '대한민국',
            },
            currentCity: {
              type: 'string',
              example: '서울',
            },
            mainLanguage: {
              type: 'string',
              example: '한국어',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
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

  @ApiOperation({ summary: '프로필 부분 업데이트', description: '사용자 프로필 정보를 부분적으로 업데이트합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '프로필 부분 업데이트 성공',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'user123',
        },
        currentCity: {
          type: 'string',
          example: '서울',
        },
        mainLanguage: {
          type: 'string',
          example: '한국어',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Body() updateData: UpdateUserProfileDto,
    @Req() request: RequestWithUser,
  ) {
    const userId = request.user.uid;
    return await this.userService.updateUserProfile(userId, updateData);
  }
} 