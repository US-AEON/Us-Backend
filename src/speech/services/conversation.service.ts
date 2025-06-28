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
  LANGUAGE_NAMES,
} from '../../shared/constants/language.constants';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../firebase/firebase.service';
import * as admin from 'firebase-admin';

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
    private readonly firebaseService: FirebaseService,
  ) {}

  async processConversation(
    inputAudioBuffer: Buffer,
    targetForeignLanguageCode: string,
    existingConversationId?: string,
  ): Promise<ConversationResult> {
    const processingStartTime = Date.now();
    this.logger.log('Starting conversation processing');

    try {
      // 대화 ID 설정
      const conversationId = existingConversationId || uuidv4();
      
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

      // Phase 3: 이전 대화 이력 가져오기
      const conversationHistory = await this.getConversationHistory(conversationId);
      
      // Phase 4: Translation with context
      const translationTask = this.createTranslationTask(
        detectedLanguageResult,
        targetForeignLanguageCode,
      );

      const translatedText = await this.performTranslationWithContext(
        translationTask,
        conversationHistory
      );
      this.logger.log(`Translation completed: "${translatedText}"`);

      // Phase 5: Text-to-speech synthesis
      const synthesizedAudioBuffer =
        await this.textToSpeechService.convertTextToSpeech(
          translatedText,
          translationTask.targetLanguage,
        );

      // Phase 6: Message creation
      const conversationMessage = this.createConversationMessage({
        originalText: detectedLanguageResult.transcript,
        originalLanguage: detectedLanguageResult.detectedLanguage,
        translatedText,
        translatedLanguage: translationTask.targetLanguage,
        confidence: detectedLanguageResult.confidence,
        audioBuffer: synthesizedAudioBuffer,
      });

      // Phase 7: 대화 이력 저장
      await this.storeConversationMessage(conversationId, conversationMessage);

      const processingDuration = Date.now() - processingStartTime;

      this.logger.log(
        `Conversation processing completed in ${processingDuration}ms`,
      );

      return {
        success: true,
        message: conversationMessage,
        conversationId: conversationId,
      };
    } catch (error) {
      this.logger.error('Conversation processing failed:', error);
      throw error;
    }
  }

  // Firestore에서 대화 이력 가져오기
  private async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const conversationDoc = await firestore
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        return [];
      }

      const data = conversationDoc.data();
      return (data?.messages || []) as ConversationMessage[];
    } catch (error) {
      this.logger.error('Failed to get conversation history:', error);
      return [];
    }
  }

  // Firestore에 대화 메시지 저장
  private async storeConversationMessage(
    conversationId: string,
    message: ConversationMessage,
  ): Promise<void> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 대화 문서 참조
      const conversationRef = firestore.collection('conversations').doc(conversationId);
      
      // 현재 대화 문서 가져오기
      const conversationDoc = await conversationRef.get();
      
      if (conversationDoc.exists) {
        // 기존 메시지에 새 메시지 추가
        await conversationRef.update({
          messages: admin.firestore.FieldValue.arrayUnion(message),
          updatedAt: new Date(),
        });
      } else {
        // 새 대화 문서 생성
        await conversationRef.set({
          messages: [message],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      this.logger.log(`Conversation message stored for ID: ${conversationId}`);
    } catch (error) {
      this.logger.error('Failed to store conversation message:', error);
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

  // 문맥을 고려한 번역 수행
  private async performTranslationWithContext(
    task: TranslationTask,
    conversationHistory: ConversationMessage[],
  ): Promise<string> {
    const isTranslatingFromKorean =
      task.sourceLanguage === DEFAULT_LANGUAGE_CODE;

    // 문맥 기반 프롬프트 생성
    let contextPrompt = '';
    if (conversationHistory && conversationHistory.length > 0) {
      // 최근 5개 메시지만 사용
      const recentMessages = conversationHistory.slice(-5);
      
      contextPrompt = '다음은 이전 대화 내용입니다:\n\n';
      recentMessages.forEach((msg, index) => {
        contextPrompt += `[${index + 1}] 원본(${msg.originalLanguage}): "${msg.originalText}"\n`;
        contextPrompt += `    번역(${msg.translatedLanguage}): "${msg.translatedText}"\n\n`;
      });
    }

    if (isTranslatingFromKorean) {
      const targetLanguageEnum = this.getLanguageEnumFromCode(
        task.targetLanguage,
      );
      
      // 문맥을 포함한 번역 프롬프트
      const prompt = `${contextPrompt}
위 대화 맥락을 고려하여 다음 한국어 텍스트를 ${LANGUAGE_NAMES[targetLanguageEnum]}(${targetLanguageEnum})로 번역해주세요.
번역된 텍스트만 반환하세요:

"${task.sourceText}"`;

      return this.geminiService.generateWithPrompt(prompt);
    } else {
      const sourceLanguageEnum = this.getLanguageEnumFromCode(
        task.sourceLanguage,
      );
      
      // 문맥을 포함한 번역 프롬프트
      const prompt = `${contextPrompt}
위 대화 맥락을 고려하여 다음 ${LANGUAGE_NAMES[sourceLanguageEnum]}(${sourceLanguageEnum}) 텍스트를 한국어로 번역해주세요.
번역된 텍스트만 반환하세요:

"${task.sourceText}"`;

      return this.geminiService.generateWithPrompt(prompt);
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
    // 언어 코드를 Language enum으로 변환
    const originalLanguage = this.getLanguageEnumFromCode(params.originalLanguage);
    const translatedLanguage = this.getLanguageEnumFromCode(params.translatedLanguage);
    
    // 원본 언어와 번역 언어가 같으면 번역 정보 생략
    const isSameLanguage = originalLanguage === translatedLanguage;
    
    return {
      id: uuidv4(),
      timestamp: new Date(),
      originalText: params.originalText,
      originalLanguage: originalLanguage,
      audioData: params.audioBuffer.toString('base64'),
      ...(isSameLanguage ? {} : {
        translatedText: params.translatedText,
        translatedLanguage: translatedLanguage,
      }),
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
  
  // 대화 이력 조회 API용 메서드
  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return this.getConversationHistory(conversationId);
  }
}
