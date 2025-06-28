import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostResponse } from './interfaces/post-response.interface';

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: { uid: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  // 현재 사용자 워크스페이스의 게시물 목록 조회
  @Get('posts')
  async getPosts(
    @Request() req: RequestWithUser,
  ): Promise<PostResponse[]> {
    return this.postService.getPostsByUser(req.user.uid);
  }

  // 게시물 생성
  @Post('posts')
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Request() req: RequestWithUser,
  ): Promise<PostResponse> {
    return this.postService.createPost(createPostDto, req.user.uid);
  }

  // 게시물 상세 조회
  @Get('posts/:postId')
  async getPostById(
    @Param('postId') postId: string,
    @Request() req: RequestWithUser,
  ): Promise<PostResponse> {
    return this.postService.getPostById(postId, req.user.uid);
  }
} 