import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// JWT 사용자 정보를 포함하는 Request 타입 확장
interface RequestWithUser extends Request {
  user: {
    uid: string;
  };
}

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '카카오 로그인', description: '카카오 ID 토큰으로 로그인합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '로그인 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '카카오 로그인 성공',
        },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                uid: {
                  type: 'string',
                  example: 'user123',
                },
                email: {
                  type: 'string',
                  example: 'user@example.com',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post('kakao')
  @HttpCode(HttpStatus.OK)
  async kakaoLogin(@Body() kakaoLoginDto: KakaoLoginDto) {
    const result = await this.authService.kakaoLogin(kakaoLoginDto.idToken);
    return {
      success: true,
      message: '카카오 로그인 성공',
      data: result
    };
  }

  @ApiOperation({ summary: '토큰 갱신', description: '리프레시 토큰을 사용하여 액세스 토큰을 갱신합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '토큰 갱신 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '토큰 갱신 성공',
        },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
    return {
      success: true,
      message: '토큰 갱신 성공',
      data: result
    };
  }

  @ApiOperation({ summary: '로그아웃', description: '사용자를 로그아웃 처리합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '로그아웃 성공',
        },
        data: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: RequestWithUser) {
    const userId = request.user.uid;
    const result = await this.authService.logout(userId);
    return {
      success: true,
      message: '로그아웃 성공',
      data: result
    };
  }
} 