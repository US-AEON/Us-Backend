import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KakaoLoginDto {
  @ApiProperty({
    description: '카카오 로그인 ID 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({ message: '카카오 ID 토큰은 필수입니다.' })
  @IsString({ message: '카카오 ID 토큰은 문자열이어야 합니다.' })
  idToken: string;
} 