import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoLoginDto {
  @IsNotEmpty({ message: '카카오 ID 토큰은 필수입니다.' })
  @IsString({ message: '카카오 ID 토큰은 문자열이어야 합니다.' })
  idToken: string;
} 