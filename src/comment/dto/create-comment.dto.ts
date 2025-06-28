import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '좋은 게시물이네요!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
  
  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우)',
    example: 'abcd1234',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}