import { Body, Controller, Get, Param, Post, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostResponse } from './interfaces/post-response.interface';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from '../shared/interfaces/standard-response.interface';

// Request 객체 타입 정의
interface RequestWithUser extends Request {
  user: { uid: string };
}

@ApiTags('게시물')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  // 현재 사용자 워크스페이스의 게시물 목록 조회
  @ApiOperation({ summary: '게시물 목록 조회', description: '현재 사용자 워크스페이스의 게시물 목록을 조회합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '게시물 목록 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '게시물 목록 조회 성공',
        },
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/PostResponse',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Get('posts')
  @HttpCode(HttpStatus.OK)
  async getPosts(
    @Request() req: RequestWithUser,
  ): Promise<StandardResponse<PostResponse[]>> {
    const posts = await this.postService.getPostsByUser(req.user.uid);
    return {
      success: true,
      message: '게시물 목록 조회 성공',
      data: posts
    };
  }

  // 게시물 생성
  @ApiOperation({ summary: '게시물 생성', description: '새로운 게시물을 생성합니다.' })
  @ApiResponse({ 
    status: 201, 
    description: '게시물 생성 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '게시물 생성 성공',
        },
        data: {
          $ref: '#/components/schemas/PostResponse',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Request() req: RequestWithUser,
  ): Promise<StandardResponse<PostResponse>> {
    const post = await this.postService.createPost(createPostDto, req.user.uid);
    return {
      success: true,
      message: '게시물 생성 성공',
      data: post
    };
  }

  // 게시물 상세 조회
  @ApiOperation({ summary: '게시물 상세 조회', description: '특정 게시물의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'postId', description: '게시물 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '게시물 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '게시물 조회 성공',
        },
        data: {
          $ref: '#/components/schemas/PostResponse',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없음' })
  @Get('posts/:postId')
  @HttpCode(HttpStatus.OK)
  async getPostById(
    @Param('postId') postId: string,
    @Request() req: RequestWithUser,
  ): Promise<StandardResponse<PostResponse>> {
    const post = await this.postService.getPostById(postId, req.user.uid);
    return {
      success: true,
      message: '게시물 조회 성공',
      data: post
    };
  }
} 