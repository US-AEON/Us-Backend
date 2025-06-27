import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TextToSpeechRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  languageCode?: string = 'en-US';
}
