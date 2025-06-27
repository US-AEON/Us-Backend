import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: '리프레시 토큰은 필수입니다.' })
  @IsString({ message: '리프레시 토큰은 문자열이어야 합니다.' })
  refreshToken: string;
} 