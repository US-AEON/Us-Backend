import { Injectable, Logger } from '@nestjs/common';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { SpeechToTextResponseDto } from './dto/speech-response.dto';

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
  ) {}

  async processAudioFile(
    audioBuffer: Buffer,
    languageCode: string,
  ): Promise<SpeechToTextResponseDto> {
    const startTime = Date.now();

    this.logger.log('Processing audio file for speech-to-text conversion');

    // 필수 파라미터 검증
    if (!languageCode) {
      throw new Error('Language code is required');
    }

    try {
      const result = await this.speechToTextService.convertSpeechToText(
        audioBuffer,
        languageCode,
      );

      const processingTimeMs = Date.now() - startTime;

      return {
        originalText: result.transcript,
        confidence: result.confidence,
        languageCode: result.languageCode,
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error('Audio processing failed:', error);
      throw error;
    }
  }

  async convertTextToSpeech(
    text: string,
    languageCode: string,
  ): Promise<Buffer> {
    this.logger.log('Processing text for text-to-speech conversion');

    // 필수 파라미터 검증
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    if (!languageCode) {
      throw new Error('Language code is required');
    }

    try {
      const audioBuffer = await this.textToSpeechService.convertTextToSpeech(
        text,
        languageCode,
      );

      return audioBuffer;
    } catch (error) {
      this.logger.error('Text-to-speech processing failed:', error);
      throw error;
    }
  }
}
