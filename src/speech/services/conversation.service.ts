import { Injectable, Logger } from '@nestjs/common';
import { SpeechToTextService } from './speech-to-text.service';
import { TextToSpeechService } from './text-to-speech.service';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import {
  DetectedLanguageResult,
  ConversationMessage,
  ConversationResult,
} from '../interfaces/conversation-result.interface';
import {
  Language,
  DEFAULT_LANGUAGE_CODE,
} from '../../shared/constants/language.constants';
import { v4 as uuidv4 } from 'uuid';

interface DualSpeechRecognitionResult {
  korean: { transcript: string; confidence: number };
  foreign: { transcript: string; confidence: number };
}

interface TranslationTask {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  private readonly SUPPORTED_LANGUAGES = new Map<string, Language>([
    ['en-US', Language.ENGLISH],
    ['vi-VN', Language.VIETNAMESE],
    ['km-KH', Language.KHMER],
  ]);

  constructor(
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly geminiService: GeminiService,
  ) {}

  async processConversation(
    inputAudioBuffer: Buffer,
    targetForeignLanguageCode: string,
    existingConversationId?: string,
  ): Promise<ConversationResult> {
    const processingStartTime = Date.now();
    this.logger.log('Starting conversation processing');

    try {
      // Phase 1: Dual speech recognition
      const speechRecognitionResults = await this.performDualSpeechRecognition(
        inputAudioBuffer,
        targetForeignLanguageCode,
      );

      // Phase 2: Language detection and source selection
      const detectedLanguageResult = this.selectBestRecognitionResult(
        speechRecognitionResults,
        targetForeignLanguageCode,
      );

      this.logger.log(
        `Detected language: ${detectedLanguageResult.detectedLanguage}`,
      );

      // Phase 3: Translation
      const translationTask = this.createTranslationTask(
        detectedLanguageResult,
        targetForeignLanguageCode,
      );

      const translatedText = await this.performTranslation(translationTask);
      this.logger.log(`Translation completed: "${translatedText}"`);

      // Phase 4: Text-to-speech synthesis
      const synthesizedAudioBuffer =
        await this.textToSpeechService.convertTextToSpeech(
          translatedText,
          translationTask.targetLanguage,
        );

      // Phase 5: Message creation
      const conversationMessage = this.createConversationMessage({
        originalText: detectedLanguageResult.transcript,
        originalLanguage: detectedLanguageResult.detectedLanguage,
        translatedText,
        translatedLanguage: translationTask.targetLanguage,
        confidence: detectedLanguageResult.confidence,
        audioBuffer: synthesizedAudioBuffer,
      });

      const finalConversationId = existingConversationId || uuidv4();
      const processingDuration = Date.now() - processingStartTime;

      this.logger.log(
        `Conversation processing completed in ${processingDuration}ms`,
      );

      return {
        success: true,
        message: conversationMessage,
        conversationId: finalConversationId,
      };
    } catch (error) {
      this.logger.error('Conversation processing failed:', error);
      throw error;
    }
  }

  private async performDualSpeechRecognition(
    inputAudioBuffer: Buffer,
    foreignLanguageCode: string,
  ): Promise<DualSpeechRecognitionResult> {
    const [koreanSttResult, foreignSttResult] = await Promise.all([
      this.speechToTextService.convertSpeechToText(
        inputAudioBuffer,
        DEFAULT_LANGUAGE_CODE,
      ),
      this.speechToTextService.convertSpeechToText(
        inputAudioBuffer,
        foreignLanguageCode,
      ),
    ]);

    this.logger.log(
      `Korean STT: "${koreanSttResult.transcript}" (confidence: ${koreanSttResult.confidence})`,
    );
    this.logger.log(
      `Foreign STT: "${foreignSttResult.transcript}" (confidence: ${foreignSttResult.confidence})`,
    );

    return {
      korean: koreanSttResult,
      foreign: foreignSttResult,
    };
  }

  private selectBestRecognitionResult(
    sttResults: DualSpeechRecognitionResult,
    foreignLanguageCode: string,
  ): DetectedLanguageResult {
    const isKoreanBetter =
      sttResults.korean.confidence >= sttResults.foreign.confidence;

    return isKoreanBetter
      ? {
          detectedLanguage: DEFAULT_LANGUAGE_CODE,
          confidence: sttResults.korean.confidence,
          transcript: sttResults.korean.transcript,
        }
      : {
          detectedLanguage: foreignLanguageCode,
          confidence: sttResults.foreign.confidence,
          transcript: sttResults.foreign.transcript,
        };
  }

  private createTranslationTask(
    detectedResult: DetectedLanguageResult,
    targetForeignLanguageCode: string,
  ): TranslationTask {
    const isSourceKorean =
      detectedResult.detectedLanguage === DEFAULT_LANGUAGE_CODE;

    return {
      sourceText: detectedResult.transcript,
      sourceLanguage: detectedResult.detectedLanguage,
      targetLanguage: isSourceKorean
        ? targetForeignLanguageCode
        : DEFAULT_LANGUAGE_CODE,
    };
  }

  private async performTranslation(task: TranslationTask): Promise<string> {
    const isTranslatingFromKorean =
      task.sourceLanguage === DEFAULT_LANGUAGE_CODE;

    if (isTranslatingFromKorean) {
      const targetLanguageEnum = this.getLanguageEnumFromCode(
        task.targetLanguage,
      );
      return this.geminiService.translateFromKorean(
        task.sourceText,
        targetLanguageEnum,
      );
    } else {
      const sourceLanguageEnum = this.getLanguageEnumFromCode(
        task.sourceLanguage,
      );
      return this.geminiService.translateToKorean(
        task.sourceText,
        sourceLanguageEnum,
      );
    }
  }

  private createConversationMessage(params: {
    originalText: string;
    originalLanguage: string;
    translatedText: string;
    translatedLanguage: string;
    confidence: number;
    audioBuffer: Buffer;
  }): ConversationMessage {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      originalText: params.originalText,
      originalLanguage: params.originalLanguage,
      translatedText: params.translatedText,
      translatedLanguage: params.translatedLanguage,
      confidence: params.confidence,
      audioData: params.audioBuffer.toString('base64'),
    };
  }

  private getLanguageEnumFromCode(languageCode: string): Language {
    const language = this.SUPPORTED_LANGUAGES.get(languageCode);

    if (!language) {
      this.logger.warn(
        `Unsupported language code: ${languageCode}, defaulting to English`,
      );
      return Language.ENGLISH;
    }

    return language;
  }
}
