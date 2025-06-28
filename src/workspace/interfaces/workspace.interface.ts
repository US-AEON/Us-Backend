import { ApiProperty } from '@nestjs/swagger';

export class Workspace {
  @ApiProperty({
    description: '워크스페이스 ID',
    example: 'workspace123',
  })
  id: string;

  @ApiProperty({
    description: '워크스페이스 제목',
    example: '팀 프로젝트',
  })
  title: string;

  @ApiProperty({
    description: '워크스페이스 초대 코드',
    example: 'ABC123',
  })
  code: string; 

  @ApiProperty({
    description: '워크스페이스 생성자 ID',
    example: 'user123',
  })
  createdBy: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2025-06-28T10:30:00Z',
  })
  createdAt: Date;
} 