import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationRequestDto {
  @ApiProperty({
    description: '선택된 외국어 코드',
    example: 'en-US',
    examples: ['en-US', 'vi-VN', 'km-KH'],
  })
  @IsString()
  @IsNotEmpty()
  selectedForeignLanguage: string; // 'en-US', 'vi-VN', 'km-KH'

  @ApiProperty({
    description: '대화 세션 ID',
    example: 'conv-123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string; // 대화 세션 ID
}
