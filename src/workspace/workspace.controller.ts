import { Body, Controller, Delete, Get, Post, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Workspace } from './interfaces/workspace.interface';

// JWT 페이로드 타입 정의
interface JwtPayload {
  uid: string;
}

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // 워크스페이스 생성
  @Post()
  async createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<Workspace> {
    return this.workspaceService.createWorkspace(createWorkspaceDto, req.user.uid);
  }

  // 워크스페이스 참여
  @Post('join')
  async joinWorkspace(
    @Body() joinWorkspaceDto: JoinWorkspaceDto,
    @Request() req: RequestWithUser,
  ): Promise<Workspace> {
    return this.workspaceService.joinWorkspace(joinWorkspaceDto, req.user.uid);
  }

  // 현재 사용자의 워크스페이스 조회
  @Get()
  async getWorkspace(@Request() req: RequestWithUser): Promise<Workspace> {
    return this.workspaceService.getCurrentWorkspace(req.user.uid);
  }

  // 워크스페이스 나가기
  @Delete()
  async leaveWorkspace(@Request() req: RequestWithUser): Promise<void> {
    return this.workspaceService.leaveWorkspace(req.user.uid);
  }
} 