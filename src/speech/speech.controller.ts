import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import { SpeechToTextDto } from './dto/speech-request.dto';

@Controller('api/speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(private readonly speechService: SpeechService) {}

  @Post('convert')
  @UseInterceptors(FileInterceptor('audio'))
  async convertSpeechToText(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: SpeechToTextDto,
  ) {
    try {
      if (!audioFile) {
        throw new BadRequestException('음성 파일이 필요합니다.');
      }

      this.logger.log(`Received audio file: ${audioFile.originalname}`);
      this.logger.log(`File size: ${audioFile.size} bytes`);
      this.logger.log(`MIME type: ${audioFile.mimetype}`);
      // 필수 파라미터 검증
      if (!body.sourceLanguage) {
        throw new BadRequestException('sourceLanguage 누락.');
      }

      this.logger.log(`Source language: ${body.sourceLanguage}`);

      const result = await this.speechService.processAudioFile(
        audioFile.buffer,
        body.sourceLanguage,
      );

      this.logger.log(`Conversion completed successfully`);
      this.logger.log(`Recognized text: "${result.originalText}"`);
      this.logger.log(`Confidence: ${result.confidence}`);
      this.logger.log(`Processing time: ${result.processingTimeMs}ms`);

      return {
        success: true,
        data: result,
        message: '음성이 성공적으로 텍스트로 변환되었습니다.',
      };
    } catch (error) {
      this.logger.error('Speech conversion failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        message: '음성 변환 중 오류가 발생했습니다.',
      };
    }
  }
}
