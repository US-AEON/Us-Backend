import { IsString, IsNotEmpty, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Language } from '../../shared/constants/language.constants';
import { Type } from 'class-transformer';

export class ProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear: number;

  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsString()
  @IsNotEmpty()
  currentCity: string;

  @IsEnum(Language)
  mainLanguage: Language;
} 