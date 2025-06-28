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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConversationService } from './services/conversation.service';
import { ConversationRequestDto } from './dto/conversation-request.dto';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StandardResponse } from '../shared/interfaces/standard-response.interface';
import { ConversationResult } from './interfaces/conversation-result.interface';

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
}
