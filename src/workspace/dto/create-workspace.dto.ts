import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: '워크스페이스 제목',
    example: '팀 프로젝트',
    minLength: 4,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(10)
  title: string;
} 