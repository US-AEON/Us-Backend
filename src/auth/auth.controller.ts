import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

// JWT 사용자 정보를 포함하는 Request 타입 확장
interface RequestWithUser extends Request {
  user: {
    uid: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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