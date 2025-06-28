import { ApiProperty } from '@nestjs/swagger';

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
    description: '원본 언어 코드',
    example: 'ko-KR',
  })
  originalLanguage: string;

  @ApiProperty({
    description: '번역된 텍스트',
    example: 'Hello',
  })
  translatedText: string;

  @ApiProperty({
    description: '번역 대상 언어 코드',
    example: 'en-US',
  })
  translatedLanguage: string;

  @ApiProperty({
    description: '음성 인식 신뢰도',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: '음성 데이터 (base64)',
    example: 'data:audio/wav;base64,UklGRiXu...',
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
