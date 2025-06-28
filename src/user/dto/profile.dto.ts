import { IsString, IsNotEmpty, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Language } from '../../shared/constants/language.constants';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '출생 연도',
    example: 1990,
    minimum: 1900,
    maximum: new Date().getFullYear(),
  })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  @Type(() => Number)
  birthYear: number;

  @ApiProperty({
    description: '국적',
    example: '대한민국',
  })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiProperty({
    description: '현재 거주 도시',
    example: '서울',
  })
  @IsString()
  @IsNotEmpty()
  currentCity: string;

  @ApiProperty({
    description: '주 사용 언어',
    enum: Language,
    example: Language.KOREAN,
  })
  @IsEnum(Language)
  mainLanguage: Language;
} 