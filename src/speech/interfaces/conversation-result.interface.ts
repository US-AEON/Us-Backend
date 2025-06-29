import { Language } from '../../shared/constants/language.constants';

export interface SpeechResult {
  transcript: string;
  confidence: number;
  languageCode: string;
}

export interface DetectedLanguageResult {
  transcript: string;
  detectedLanguage: Language;
  confidence: number;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  originalText: string;
  originalLanguage: Language;
  translatedText?: string;
  translatedLanguage?: Language;
  confidence?: number;
  audioUrl?: string;
  audioData?: string;
}

export interface ConversationResult {
  success: boolean;
  message: ConversationMessage;
  conversationId: string;
}

// 새로운 대화록 시스템 인터페이스
export interface ConversationPair {
  originalText: string;
  originalLanguage: Language;
  translatedText: string;
  translatedLanguage: Language;
  timestamp: Date;
  confidence: number;
}

export interface ConversationSession {
  id: string;
  title?: string; // 요약 제목 (저장된 경우에만)
  isTemporary: boolean; // true: 임시, false: 저장됨
  pairs: ConversationPair[];
  createdAt: Date;
  updatedAt: Date;
  savedAt?: Date; // 저장된 시간
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  savedAt: Date;
  pairCount: number;
}

export interface ConversationDetail {
  id: string;
  title: string;
  pairs: ConversationPair[];
  createdAt: Date;
  savedAt: Date;
}
