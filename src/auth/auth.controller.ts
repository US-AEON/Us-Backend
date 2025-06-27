import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';

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
} 