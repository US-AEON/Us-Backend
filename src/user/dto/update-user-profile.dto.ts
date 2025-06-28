import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Language } from '../../shared/constants/language.constants';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiProperty({
    description: '현재 거주 도시',
    example: '서울',
    required: false,
  })
  @IsString()
  @IsOptional()
  currentCity?: string;

  @ApiProperty({
    description: '주 사용 언어',
    enum: Language,
    example: Language.KOREAN,
    required: false,
  })
  @IsEnum(Language)
  @IsOptional()
  mainLanguage?: Language;
} 