export interface DetectedLanguageResult {
  detectedLanguage: string; // 감지된 언어 코드
  confidence: number;
  transcript: string;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  translatedLanguage: string;
  confidence: number;
  audioData?: string; // base64 encoded audio
}

export interface ConversationResult {
  success: boolean;
  message: ConversationMessage;
  conversationId: string;
}
