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
import { SpeechService } from './speech.service';
import { SpeechToTextDto } from './dto/speech-request.dto';
import { TextToSpeechRequestDto } from './dto/text-to-speech-request.dto';

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

  @Post('synthesize')
  async convertTextToSpeech(
    @Body() body: TextToSpeechRequestDto,
    @Res() res: Response,
  ) {
    try {
      if (!body.text || body.text.trim().length === 0) {
        throw new BadRequestException('텍스트가 필요합니다.');
      }

      this.logger.log(
        `Converting text to speech: "${body.text.substring(0, 50)}..."`,
      );
      this.logger.log(`Language: ${body.languageCode}`);

      const audioBuffer = await this.speechService.convertTextToSpeech(
        body.text,
        body.languageCode || 'en-US',
      );

      this.logger.log(`TTS conversion completed successfully`);
      this.logger.log(`Generated audio size: ${audioBuffer.length} bytes`);

      // 오디오 파일을 스트림으로 반환
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Content-Disposition': 'inline; filename="synthesized-speech.mp3"',
      });

      res.send(audioBuffer);
    } catch (error) {
      this.logger.error('Text-to-speech conversion failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
        message: '음성 합성 중 오류가 발생했습니다.',
      });
    }
  }

  @Post('process')
  @UseInterceptors(FileInterceptor('audio'))
  async processAudioComplete(
    @UploadedFile() audioFile: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      if (!audioFile) {
        throw new BadRequestException('음성 파일이 필요합니다.');
      }

      this.logger.log(`Processing complete audio workflow`);
      this.logger.log(`File size: ${audioFile.size} bytes`);

      // 1. STT: 한국어 음성 인식
      const sttResult = await this.speechService.processAudioFile(
        audioFile.buffer,
        'ko-KR',
      );

      this.logger.log(`STT completed: "${sttResult.originalText}"`);

      // 2. TTS: 인식된 텍스트를 다시 음성으로 변환
      const audioBuffer = await this.speechService.convertTextToSpeech(
        sttResult.originalText,
        'ko-KR',
      );

      this.logger.log(`TTS completed: ${audioBuffer.length} bytes`);

      // 3. JSON 응답으로 텍스트와 오디오를 모두 반환
      const audioBase64 = audioBuffer.toString('base64');

      res.json({
        success: true,
        data: {
          recognizedText: sttResult.originalText,
          confidence: sttResult.confidence,
          processingTimeMs: sttResult.processingTimeMs,
          audioData: audioBase64,
          audioSize: audioBuffer.length,
        },
        message: '음성 처리가 완료되었습니다.',
      });
    } catch (error) {
      this.logger.error('Complete audio processing failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
        message: '음성 처리 중 오류가 발생했습니다.',
      });
    }
  }
}
