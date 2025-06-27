import { Injectable, Logger } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import { getAllSupportedLanguageCodes } from '../../shared/constants/language.constants';

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  projectId?: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

@Injectable()
export class TextToSpeechService {
  private readonly logger = new Logger(TextToSpeechService.name);
  private readonly ttsClient: TextToSpeechClient;

  constructor() {
    try {
      // 프로젝트 ID
      const projectId =
        process.env.GOOGLE_CLOUD_PROJECT_ID || 'image-tool-462403';

      const clientConfig: {
        projectId: string;
        credentials?: ServiceAccountCredentials;
      } = {
        projectId: projectId,
      };

      // 환경 변수에서 직접 서비스 계정 키 JSON 참조
      if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(
            process.env.GOOGLE_SERVICE_ACCOUNT,
          ) as ServiceAccountCredentials;
          clientConfig.credentials = serviceAccount;
          this.logger.log(
            'TTS: 환경 변수의 서비스 계정 키 JSON을 사용하여 초기화합니다.',
          );

          if (serviceAccount.projectId) {
            clientConfig.projectId = serviceAccount.projectId;
            this.logger.log(
              `TTS: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.projectId}`,
            );
          }
        } catch (e) {
          this.logger.error(
            'TTS: 환경 변수의 서비스 계정 키 JSON 파싱 오류:',
            e,
          );
        }
      }
      // 서비스 계정 키 파일 경로를 사용하는 방법 (로컬 개발 환경)
      else {
        const serviceAccountPath =
          process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json';

        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(
            fs.readFileSync(serviceAccountPath, 'utf8'),
          ) as ServiceAccountCredentials;
          clientConfig.credentials = serviceAccount;
          this.logger.log('TTS: 서비스 계정 키 파일을 사용하여 초기화합니다.');

          if (serviceAccount.project_id) {
            clientConfig.projectId = serviceAccount.project_id;
            this.logger.log(
              `TTS: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.project_id}`,
            );
          }
        }
        // Google Cloud 기본 인증 정보 사용
        else {
          this.logger.log('TTS: 기본 인증 정보를 사용하여 초기화합니다.');
        }
      }

      this.ttsClient = new TextToSpeechClient(clientConfig);
      this.logger.log(
        `TTS 초기화 완료 (프로젝트 ID: ${clientConfig.projectId})`,
      );
    } catch (error) {
      this.logger.error('TTS 초기화 오류:', error);
      // 폴백으로 기본 설정 사용
      this.ttsClient = new TextToSpeechClient({
        projectId: 'image-tool-462403',
      });
    }
  }

  async convertTextToSpeech(
    text: string,
    languageCode: string,
  ): Promise<Buffer> {
    const startTime = Date.now();

    // 엄격한 검증
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    if (!languageCode || languageCode.trim().length === 0) {
      throw new Error('Language code is required');
    }

    // 지원하는 언어 코드 검증
    const supportedLanguages = getAllSupportedLanguageCodes();
    if (!supportedLanguages.includes(languageCode)) {
      throw new Error(
        `Unsupported language code: ${languageCode}. Supported: ${supportedLanguages.join(
          ', ',
        )}`,
      );
    }

    try {
      this.logger.log(`Starting text-to-speech conversion for ${languageCode}`);
      this.logger.log(`Text to convert: "${text.substring(0, 100)}..."`);

      // 언어별 음성 설정
      const voiceSettings = this.getVoiceSettings(languageCode);

      // Google Cloud Text-to-Speech API 요청 설정
      const request = {
        input: { text: text },
        voice: voiceSettings,
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      };

      // Google Cloud TTS API 호출
      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS API');
      }

      const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Text-to-speech completed in ${processingTime}ms`);
      this.logger.log(`Generated audio size: ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      this.logger.error('Text-to-speech conversion failed:', error);

      // Google Cloud API 오류 시 더 나은 오류 메시지 제공
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'number'
      ) {
        const errorCode = (error as { code: number }).code;
        switch (errorCode) {
          case 3: // INVALID_ARGUMENT
            throw new Error('잘못된 텍스트 또는 언어 설정입니다.');
          case 7: // PERMISSION_DENIED
            throw new Error('Google Cloud 인증 오류입니다.');
          case 8: // RESOURCE_EXHAUSTED
            throw new Error('API 사용량 한도를 초과했습니다.');
          default:
            throw new Error('음성 합성 서비스 오류가 발생했습니다.');
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Text-to-speech conversion failed: ${message}`);
    }
  }

  private getVoiceSettings(languageCode: string) {
    const voiceMap = {
      'ko-KR': {
        languageCode: 'ko-KR',
        name: 'ko-KR-Neural2-A', // 한국어 여성 음성
        ssmlGender: 'FEMALE' as const,
      },
      'en-US': {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F', // 영어 여성 음성
        ssmlGender: 'FEMALE' as const,
      },
      'km-KH': {
        languageCode: 'km-KH',
        name: 'km-KH-Standard-A', // 크메르어 여성 음성
        ssmlGender: 'FEMALE' as const,
      },
      'vi-VN': {
        languageCode: 'vi-VN',
        name: 'vi-VN-Neural2-A', // 베트남어 여성 음성
        ssmlGender: 'FEMALE' as const,
      },
    };

    return voiceMap[languageCode as keyof typeof voiceMap] || voiceMap['ko-KR'];
  }
}
