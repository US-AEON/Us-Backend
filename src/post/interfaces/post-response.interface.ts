import { Language } from '../../shared/constants/language.constants';
import { ApiProperty } from '@nestjs/swagger';

export class PostResponse {
  @ApiProperty({
    description: '게시물 ID',
    example: 'post123',
  })
  id: string;

  @ApiProperty({
    description: '작성자 이름',
    example: '홍길동',
  })
  authorName: string;

  @ApiProperty({
    description: '게시물 내용',
    example: '오늘은 날씨가 좋네요.',
  })
  content: string;

  @ApiProperty({
    description: '번역된 게시물 내용',
    example: 'The weather is nice today.',
    required: false,
  })
  translatedContent?: string;

  @ApiProperty({
    description: '감지된 언어',
    enum: Language,
    example: Language.KOREAN,
  })
  detectedLanguage: Language;

  @ApiProperty({
    description: '생성 일시',
    example: '2025-06-28T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2025-06-28T11:45:00Z',
    required: false,
  })
  updatedAt?: Date;
}