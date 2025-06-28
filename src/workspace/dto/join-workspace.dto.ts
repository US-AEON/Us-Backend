import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinWorkspaceDto {
  @ApiProperty({
    description: '워크스페이스 초대 코드',
    example: 'ABC123',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
} 