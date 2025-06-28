import { Language } from '../../shared/constants/language.constants';
import { ApiProperty } from '@nestjs/swagger';

export class CommentResponse {
  @ApiProperty({
    description: '댓글 ID',
    example: 'comment123',
  })
  id: string;

  @ApiProperty({
    description: '작성자 이름',
    example: '홍길동',
  })
  authorName: string;

  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우)',
    example: 'comment456',
    required: false,
  })
  parentId?: string;

  @ApiProperty({
    description: '댓글 내용',
    example: '좋은 게시물이네요!',
  })
  content: string;

  @ApiProperty({
    description: '번역된 댓글 내용 (사용자 메인 언어로)',
    example: 'Nice post!',
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

  @ApiProperty({
    description: '대댓글 목록',
    type: [CommentResponse],
    required: false,
  })
  children?: CommentResponse[];
}