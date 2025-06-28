import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentResponse } from './interfaces/comment-response.interface';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: { uid: string };
}

@ApiTags('댓글')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // 게시물의 댓글 목록 조회
  @ApiOperation({ summary: '댓글 목록 조회', description: '특정 게시물의 댓글 목록을 조회합니다.' })
  @ApiParam({ name: 'postId', description: '게시물 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '댓글 목록 조회 성공',
    type: [CommentResponse]
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없음' })
  @Get('posts/:postId/comments')
  async getCommentsByPost(
    @Param('postId') postId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommentResponse[]> {
    return this.commentService.getCommentsByPost(postId, req.user.uid);
  }

  // 댓글 생성
  @ApiOperation({ summary: '댓글 생성', description: '특정 게시물에 댓글을 작성합니다.' })
  @ApiParam({ name: 'postId', description: '게시물 ID' })
  @ApiResponse({ 
    status: 201, 
    description: '댓글 생성 성공',
    type: CommentResponse
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없음' })
  @Post('posts/:postId/comments')
  async createComment(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: RequestWithUser,
  ): Promise<CommentResponse> {
    return this.commentService.createComment(postId, createCommentDto, req.user.uid);
  }
} 