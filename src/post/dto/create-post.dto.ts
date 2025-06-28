import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    description: '게시물 내용',
    example: '오늘은 날씨가 좋네요.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
} 