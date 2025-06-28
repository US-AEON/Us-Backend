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

  // 새로운 대화록 시스템 메서드들

  // 새 대화록 세션 생성 또는 기존 세션에 추가
  async addToConversationSession(
    inputAudioBuffer: Buffer,
    targetForeignLanguageCode: string,
    existingSessionId?: string,
  ): Promise<{ sessionId: string; pair: ConversationPair; audioBuffer: Buffer }> {
    const processingStartTime = Date.now();
    this.logger.log('Starting conversation session processing');

    try {
      // Phase 1: 음성 인식 및 번역 (기존 로직 재사용)
      const speechRecognitionResults = await this.performDualSpeechRecognition(
        inputAudioBuffer,
        targetForeignLanguageCode,
      );

      const detectedLanguageResult = this.selectBestRecognitionResult(
        speechRecognitionResults,
        targetForeignLanguageCode,
      );

      const translationTask = this.createTranslationTask(
        detectedLanguageResult,
        targetForeignLanguageCode,
      );

      // 이전 대화 이력이 있으면 컨텍스트 활용
      let conversationHistory: ConversationMessage[] = [];
      if (existingSessionId) {
        conversationHistory = await this.getConversationHistory(existingSessionId);
      }

      const translatedText = await this.performTranslationWithContext(
        translationTask,
        conversationHistory
      );

      // Phase 2: TTS 생성
      const synthesizedAudioBuffer = await this.textToSpeechService.convertTextToSpeech(
        translatedText,
        translationTask.targetLanguage,
      );

      // Phase 3: ConversationPair 생성
      const pair: ConversationPair = {
        originalText: detectedLanguageResult.transcript,
        originalLanguage: detectedLanguageResult.detectedLanguage,
        translatedText,
        translatedLanguage: translationTask.targetLanguage,
        timestamp: new Date(),
        confidence: detectedLanguageResult.confidence,
      };

      // Phase 4: 세션에 저장
      const sessionId = existingSessionId || uuidv4();
      await this.storeConversationPair(sessionId, pair);

      const processingDuration = Date.now() - processingStartTime;
      this.logger.log(`Conversation session processing completed in ${processingDuration}ms`);

      return {
        sessionId,
        pair,
        audioBuffer: synthesizedAudioBuffer,
      };
    } catch (error) {
      this.logger.error('Conversation session processing failed:', error);
      throw error;
    }
  }

  // 대화록 세션에 ConversationPair 저장
  private async storeConversationPair(sessionId: string, pair: ConversationPair): Promise<void> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const sessionRef = firestore.collection('conversationSessions').doc(sessionId);
      
      const sessionDoc = await sessionRef.get();
      
      if (sessionDoc.exists) {
        // 기존 세션에 쌍 추가
        await sessionRef.update({
          pairs: admin.firestore.FieldValue.arrayUnion(pair),
          updatedAt: new Date(),
        });
      } else {
        // 새 세션 생성
        const newSession = {
          isTemporary: true,
          pairs: [pair],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await sessionRef.set(newSession);
      }
      
      this.logger.log(`Conversation pair stored for session: ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to store conversation pair:', error);
      throw error;
    }
  }

  // 대화록 저장 (요약 제목 생성)
  async saveConversationSession(sessionId: string): Promise<{ title: string; sessionId: string }> {
    try {
      this.logger.log(`Saving conversation session: ${sessionId}`);
      const firestore = this.firebaseService.getFirestore();
      const sessionRef = firestore.collection('conversationSessions').doc(sessionId);
      
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        throw new Error('대화록 세션을 찾을 수 없습니다.');
      }
      
      const sessionData = sessionDoc.data();
      const pairs = sessionData?.pairs || [];
      
      if (pairs.length === 0) {
        throw new Error('저장할 대화 내용이 없습니다.');
      }
      
      // Gemini로 요약 제목 생성
      const title = await this.generateConversationTitle(pairs);
      
      // 세션을 영구 저장으로 변경
      await sessionRef.update({
        title,
        isTemporary: false,
        savedAt: new Date(),
        updatedAt: new Date(),
      });
      
      this.logger.log(`Conversation session saved with title: ${title}`);
      
      return { title, sessionId };
    } catch (error) {
      this.logger.error('Failed to save conversation session:', error);
      throw error;
    }
  }

  // Gemini로 대화록 요약 제목 생성
  private async generateConversationTitle(pairs: ConversationPair[]): Promise<string> {
    try {
      // 대화 내용을 텍스트로 조합
      const conversationText = pairs.map(pair => 
        `[${pair.originalLanguage}] ${pair.originalText} → [${pair.translatedLanguage}] ${pair.translatedText}`
      ).join('\n');
      
      const prompt = `다음 대화 내용을 바탕으로 간단하고 명확한 제목을 한국어로 생성해주세요. 제목은 15자 이내로 해주세요:

${conversationText}

제목만 반환해주세요.`;
      
      const title = await this.geminiService.generateWithPrompt(prompt);
      
      // 제목이 너무 길면 자르기
      return title.length > 15 ? title.substring(0, 15) + '...' : title;
    } catch (error) {
      this.logger.error('Failed to generate conversation title:', error);
      // 실패 시 기본 제목 반환
      return `대화 ${new Date().toLocaleDateString()}`;
    }
  }

  // 저장된 대화록 목록 조회 (제목 + ID만)
  async getConversationSummaries(): Promise<ConversationSummary[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      const snapshot = await firestore
        .collection('conversationSessions')
        .where('isTemporary', '==', false)
        .orderBy('savedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt.toDate(),
          savedAt: data.savedAt.toDate(),
          pairCount: data.pairs?.length || 0,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get conversation summaries:', error);
      throw error;
    }
  }

  // 특정 대화록 상세 조회 (STT-번역 쌍 배열)
  async getConversationDetail(sessionId: string): Promise<ConversationDetail> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const sessionDoc = await firestore.collection('conversationSessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error('대화록을 찾을 수 없습니다.');
      }
      
      const data = sessionDoc.data();
      
      if (data?.isTemporary !== false) {
        throw new Error('저장되지 않은 임시 대화록입니다.');
      }
      
      return {
        id: sessionDoc.id,
        title: data.title,
        pairs: data.pairs || [],
        createdAt: data.createdAt.toDate(),
        savedAt: data.savedAt.toDate(),
      };
    } catch (error) {
      this.logger.error('Failed to get conversation detail:', error);
      throw error;
    }
  }
}
