import { Body, Controller, Delete, Get, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Workspace } from './interfaces/workspace.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from '../shared/interfaces/standard-response.interface';

// JWT 페이로드 타입 정의
interface JwtPayload {
  uid: string;
}

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: JwtPayload;
}

@ApiTags('워크스페이스')
@ApiBearerAuth()
@Controller('api/workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // 워크스페이스 생성
  @ApiOperation({ summary: '워크스페이스 생성', description: '새로운 워크스페이스를 생성합니다.' })
  @ApiResponse({ 
    status: 201, 
    description: '워크스페이스 생성 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '워크스페이스 생성 성공',
        },
        data: {
          $ref: '#/components/schemas/Workspace',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<StandardResponse<Workspace>> {
    const workspace = await this.workspaceService.createWorkspace(createWorkspaceDto, req.user.uid);
    return {
      success: true,
      message: '워크스페이스 생성 성공',
      data: workspace
    };
  }

  // 워크스페이스 참여
  @ApiOperation({ summary: '워크스페이스 참여', description: '초대 코드를 사용하여 워크스페이스에 참여합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '워크스페이스 참여 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '워크스페이스 참여 성공',
        },
        data: {
          $ref: '#/components/schemas/Workspace',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinWorkspace(
    @Body() joinWorkspaceDto: JoinWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<StandardResponse<Workspace>> {
    const workspace = await this.workspaceService.joinWorkspace(joinWorkspaceDto, req.user.uid);
    return {
      success: true,
      message: '워크스페이스 참여 성공',
      data: workspace
    };
  }

  // 현재 사용자의 워크스페이스 조회
  @ApiOperation({ summary: '현재 워크스페이스 조회', description: '현재 사용자의 워크스페이스 정보를 조회합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '워크스페이스 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '워크스페이스 조회 성공',
        },
        data: {
          $ref: '#/components/schemas/Workspace',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWorkspace(@Request() req: RequestWithUser): Promise<StandardResponse<Workspace>> {
    const workspace = await this.workspaceService.getCurrentWorkspace(req.user.uid);
    return {
      success: true,
      message: '워크스페이스 조회 성공',
      data: workspace
    };
  }

  // 워크스페이스 나가기
  @ApiOperation({ summary: '워크스페이스 나가기', description: '현재 워크스페이스에서 나갑니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '워크스페이스 나가기 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '워크스페이스 나가기 성공',
        },
        data: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Delete()
  @HttpCode(HttpStatus.OK)
  async leaveWorkspace(@Request() req: RequestWithUser): Promise<StandardResponse<boolean>> {
    await this.workspaceService.leaveWorkspace(req.user.uid);
    return {
      success: true,
      message: '워크스페이스 나가기 성공',
      data: true
    };
  }
} 