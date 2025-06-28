import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
  BadRequestException,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConversationService } from './services/conversation.service';
import { ConversationRequestDto } from './dto/conversation-request.dto';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StandardResponse } from '../shared/interfaces/standard-response.interface';
import { ConversationResult, ConversationMessage } from './interfaces/conversation-result.interface';

@ApiTags('음성')
@Controller('api/speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(
    private readonly conversationService: ConversationService
  ) {}

  @ApiOperation({ summary: '음성 대화', description: '음성 파일을 업로드하여 대화를 처리합니다.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '음성 파일과 대화 설정',
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: '음성 파일 (WAV, MP3 등)',
        },
        selectedForeignLanguage: {
          type: 'string',
          description: '선택된 외국어 코드 (en-US, vi-VN, km-KH)',
        },
        conversationId: {
          type: 'string',
          description: '대화 세션 ID (선택 사항)',
          nullable: true,
        },
      },
      required: ['audio', 'selectedForeignLanguage'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: '대화 처리 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화가 성공적으로 처리되었습니다.',
        },
        data: {
          type: 'object',
          properties: {
            inputText: {
              type: 'string',
              example: '안녕하세요, 오늘 날씨는 어때요?',
            },
            responseText: {
              type: 'string',
              example: '안녕하세요! 오늘은 맑고 화창한 날씨입니다. 최고 기온은 25도로 예상됩니다.',
            },
            audioUrl: {
              type: 'string',
              example: 'https://storage.googleapis.com/project-id/audio/response-123456.mp3',
            },
            detectedLanguage: {
              type: 'string',
              example: 'ko',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('conversation')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async processConversation(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: ConversationRequestDto
  ): Promise<StandardResponse<ConversationResult>> {
    this.logger.log(`Processing conversation`);
    this.logger.log(`Selected foreign language: ${body.selectedForeignLanguage}`);
    this.logger.log(`Conversation ID: ${body.conversationId || 'new'}`);

    const result = await this.conversationService.processConversation(
      audioFile.buffer,
      body.selectedForeignLanguage,
      body.conversationId,
    );

    this.logger.log(`Conversation processing completed`);

    return {
      success: true,
      message: '대화가 성공적으로 처리되었습니다.',
      data: result
    };
  }

  @ApiOperation({ summary: '대화 이력 조회', description: '특정 대화 세션의 이력을 조회합니다.' })
  @ApiParam({ name: 'conversationId', description: '대화 세션 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '대화 이력 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화 이력이 성공적으로 조회되었습니다.',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              originalText: { type: 'string' },
              originalLanguage: { type: 'string' },
              translatedText: { type: 'string' },
              translatedLanguage: { type: 'string' },
              confidence: { type: 'number' },
            }
          }
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('conversation/:conversationId/history')
  async getConversationHistory(
    @Param('conversationId') conversationId: string
  ): Promise<StandardResponse<ConversationMessage[]>> {
    this.logger.log(`Retrieving conversation history for ID: ${conversationId}`);

    const messages = await this.conversationService.getConversationMessages(conversationId);

    return {
      success: true,
      message: '대화 이력이 성공적으로 조회되었습니다.',
      data: messages
    };
  }

  // 새로운 대화록 시스템 API

  @ApiOperation({ summary: '대화록 세션 추가', description: '음성 파일을 업로드하여 대화록 세션에 추가합니다.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '음성 파일과 세션 설정',
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: '음성 파일 (WAV, MP3 등)',
        },
        selectedForeignLanguage: {
          type: 'string',
          description: '선택된 외국어 코드 (en-US, vi-VN, km-KH)',
        },
        sessionId: {
          type: 'string',
          description: '대화록 세션 ID (선택 사항)',
          nullable: true,
        },
      },
      required: ['audio', 'selectedForeignLanguage'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: '대화록 세션 추가 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화가 성공적으로 처리되었습니다.',
        },
        data: {
          type: 'object',
          properties: {
            inputText: {
              type: 'string',
              example: '안녕하세요, 오늘 날씨는 어때요?',
            },
            responseText: {
              type: 'string',
              example: 'Hello, how is the weather today?',
            },
            audioUrl: {
              type: 'string',
              example: 'data:audio/mp3;base64,UklGRn...',
            },
            detectedLanguage: {
              type: 'string',
              example: 'ko',
            },
            conversationId: {
              type: 'string',
              example: 'session_123456',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async addToSession(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: { selectedForeignLanguage: string; sessionId?: string }
  ): Promise<StandardResponse<any>> {
    this.logger.log(`Adding to conversation session`);
    this.logger.log(`Selected foreign language: ${body.selectedForeignLanguage}`);
    this.logger.log(`Session ID: ${body.sessionId || 'new'}`);

    const result = await this.conversationService.addToConversationSession(
      audioFile.buffer,
      body.selectedForeignLanguage,
      body.sessionId,
    );

    this.logger.log(`Session processing completed`);

    // 기존 API와 동일한 응답 형식으로 변환
    return {
      success: true,
      message: '대화가 성공적으로 처리되었습니다.',
      data: {
        inputText: result.pair.originalText,
        responseText: result.pair.translatedText,
        audioUrl: `data:audio/mp3;base64,${result.audioBuffer.toString('base64')}`,
        detectedLanguage: result.pair.originalLanguage,
        conversationId: result.sessionId,
      }
    };
  }

  @ApiOperation({ summary: '대화록 저장', description: '임시 대화록을 영구 저장합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '대화록 저장 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화록이 성공적으로 저장되었습니다.',
        },
        data: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('save')
  @HttpCode(HttpStatus.OK)
  async saveSession(
    @Body() body: { sessionId: string }
  ): Promise<StandardResponse<any>> {
    this.logger.log(`Saving conversation session: ${body.sessionId}`);

    const result = await this.conversationService.saveConversationSession(body.sessionId);

    return {
      success: true,
      message: '대화록이 성공적으로 저장되었습니다.',
      data: result
    };
  }

  @ApiOperation({ summary: '대화록 목록 조회', description: '저장된 대화록 목록을 조회합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '대화록 목록 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화록 목록이 성공적으로 조회되었습니다.',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              createdAt: { type: 'string' },
              savedAt: { type: 'string' },
              pairCount: { type: 'number' },
            }
          }
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(): Promise<StandardResponse<any>> {
    this.logger.log(`Retrieving conversation sessions`);

    const sessions = await this.conversationService.getConversationSummaries();

    return {
      success: true,
      message: '대화록 목록이 성공적으로 조회되었습니다.',
      data: sessions
    };
  }

  @ApiOperation({ summary: '대화록 상세 조회', description: '특정 대화록의 상세 내용을 조회합니다.' })
  @ApiParam({ name: 'sessionId', description: '대화록 세션 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '대화록 상세 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '대화록 상세 정보가 성공적으로 조회되었습니다.',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            pairs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  originalText: { type: 'string' },
                  originalLanguage: { type: 'string' },
                  translatedText: { type: 'string' },
                  translatedLanguage: { type: 'string' },
                  timestamp: { type: 'string' },
                  confidence: { type: 'number' },
                }
              }
            },
            createdAt: { type: 'string' },
            savedAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '대화록을 찾을 수 없음' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async getSessionDetail(
    @Param('sessionId') sessionId: string
  ): Promise<StandardResponse<any>> {
    this.logger.log(`Retrieving session detail for ID: ${sessionId}`);

    const sessionDetail = await this.conversationService.getConversationDetail(sessionId);

    return {
      success: true,
      message: '대화록 상세 정보가 성공적으로 조회되었습니다.',
      data: sessionDetail
    };
  }
}
