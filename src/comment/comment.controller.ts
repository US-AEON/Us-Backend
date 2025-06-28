import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentResponse } from './interfaces/comment-response.interface';

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: { uid: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // 게시물의 댓글 목록 조회
  @Get('posts/:postId/comments')
  async getCommentsByPost(
    @Param('postId') postId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommentResponse[]> {
    return this.commentService.getCommentsByPost(postId, req.user.uid);
  }

  // 댓글 생성
  @Post('posts/:postId/comments')
  async createComment(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: RequestWithUser,
  ): Promise<CommentResponse> {
    return this.commentService.createComment(postId, createCommentDto, req.user.uid);
  }
} 