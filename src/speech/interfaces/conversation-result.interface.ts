import { ApiProperty } from '@nestjs/swagger';
import { Language } from '../../shared/constants/language.constants';

export class DetectedLanguageResult {
  @ApiProperty({
    description: '감지된 언어 코드',
    example: 'ko-KR',
  })
  detectedLanguage: string;

  @ApiProperty({
    description: '감지 신뢰도',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: '인식된 텍스트',
    example: '안녕하세요',
  })
  transcript: string;
}

export class ConversationMessage {
  @ApiProperty({
    description: '메시지 ID',
    example: 'msg123',
  })
  id: string;

  @ApiProperty({
    description: '메시지 생성 시간',
    example: '2025-06-28T10:30:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: '원본 텍스트',
    example: '안녕하세요',
  })
  originalText: string;

  @ApiProperty({
    description: '원본 언어',
    enum: Language,
    example: '한국어',
  })
  originalLanguage: Language;

  @ApiProperty({
    description: '번역된 텍스트',
    example: 'Hello',
    required: false,
  })
  translatedText?: string;

  @ApiProperty({
    description: '번역 대상 언어',
    enum: Language,
    example: 'English',
    required: false,
  })
  translatedLanguage?: Language;

  @ApiProperty({
    description: 'Base64로 인코딩된 오디오 데이터',
    example: 'data:audio/mp3;base64,UklGRn...',
    required: false,
  })
  audioData?: string;
}

export class ConversationResult {
  @ApiProperty({
    description: '성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '대화 메시지',
    type: ConversationMessage,
  })
  message: ConversationMessage;

  @ApiProperty({
    description: '대화 세션 ID',
    example: 'conv123',
  })
  conversationId: string;
}
