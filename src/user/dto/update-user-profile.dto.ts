import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Language } from '../../shared/constants/language.constants';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  currentCity?: string;

  @IsEnum(Language)
  @IsOptional()
  mainLanguage?: Language;
} 