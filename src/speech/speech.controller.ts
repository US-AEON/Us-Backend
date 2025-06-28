import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConversationService } from './services/conversation.service';
import { ConversationRequestDto } from './dto/conversation-request.dto';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('음성 대화')
@Controller('api/speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({ summary: '음성 대화 처리', description: '음성 파일을 업로드하여 대화를 처리합니다.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
        data: {
          $ref: '#/components/schemas/ConversationResult',
        },
        message: {
          type: 'string',
          example: '대화가 성공적으로 처리되었습니다.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @Post('conversation')
  @UseInterceptors(FileInterceptor('audio'))
  async processConversation(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: ConversationRequestDto,
    @Res() res: Response,
  ) {
    try {
      if (!audioFile) {
        throw new BadRequestException('음성 파일이 필요합니다.');
      }

      if (!body.selectedForeignLanguage) {
        throw new BadRequestException('selectedForeignLanguage가 필요합니다.');
      }

      this.logger.log(`Processing conversation`);
      this.logger.log(
        `Selected foreign language: ${body.selectedForeignLanguage}`,
      );
      this.logger.log(`Conversation ID: ${body.conversationId || 'new'}`);

      const result = await this.conversationService.processConversation(
        audioFile.buffer,
        body.selectedForeignLanguage,
        body.conversationId,
      );

      this.logger.log(`Conversation processing completed`);
      this.logger.log(
        `Original: "${result.message.originalText}" (${result.message.originalLanguage})`,
      );
      this.logger.log(
        `Translated: "${result.message.translatedText}" (${result.message.translatedLanguage})`,
      );

      res.json({
        success: true,
        data: result,
        message: '대화가 성공적으로 처리되었습니다.',
      });
    } catch (error) {
      this.logger.error('Conversation processing failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
        message: '대화 처리 중 오류가 발생했습니다.',
      });
    }
  }
}
