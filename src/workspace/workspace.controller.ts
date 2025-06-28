import { Body, Controller, Delete, Get, Post, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Workspace } from './interfaces/workspace.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
    type: Workspace
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post()
  async createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<Workspace> {
    return this.workspaceService.createWorkspace(createWorkspaceDto, req.user.uid);
  }

  // 워크스페이스 참여
  @ApiOperation({ summary: '워크스페이스 참여', description: '초대 코드를 사용하여 워크스페이스에 참여합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '워크스페이스 참여 성공',
    type: Workspace
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Post('join')
  async joinWorkspace(
    @Body() joinWorkspaceDto: JoinWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<Workspace> {
    return this.workspaceService.joinWorkspace(joinWorkspaceDto, req.user.uid);
  }

  // 현재 사용자의 워크스페이스 조회
  @ApiOperation({ summary: '현재 워크스페이스 조회', description: '현재 사용자의 워크스페이스 정보를 조회합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '워크스페이스 조회 성공',
    type: Workspace
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Get()
  async getWorkspace(@Request() req: RequestWithUser): Promise<Workspace> {
    return this.workspaceService.getCurrentWorkspace(req.user.uid);
  }

  // 워크스페이스 나가기
  @ApiOperation({ summary: '워크스페이스 나가기', description: '현재 워크스페이스에서 나갑니다.' })
  @ApiResponse({ status: 200, description: '워크스페이스 나가기 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
  @Delete()
  async leaveWorkspace(@Request() req: RequestWithUser): Promise<void> {
    return this.workspaceService.leaveWorkspace(req.user.uid);
  }
} 