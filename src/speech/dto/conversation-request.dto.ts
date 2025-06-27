import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ConversationRequestDto {
  @IsString()
  @IsNotEmpty()
  selectedForeignLanguage: string; // 'en-US', 'vi-VN', 'km-KH'

  @IsString()
  @IsOptional()
  conversationId?: string; // 대화 세션 ID
}
