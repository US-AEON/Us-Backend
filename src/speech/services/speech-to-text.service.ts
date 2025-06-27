import { Injectable, Logger } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import * as fs from 'fs';
import { SpeechResult } from '../interfaces/speech-result.interface';
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
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);
  private readonly speechClient: SpeechClient;

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
            'Speech: 환경 변수의 서비스 계정 키 JSON을 사용하여 초기화합니다.',
          );

          if (serviceAccount.projectId) {
            clientConfig.projectId = serviceAccount.projectId;
            this.logger.log(
              `Speech: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.projectId}`,
            );
          }
        } catch (e) {
          this.logger.error(
            'Speech: 환경 변수의 서비스 계정 키 JSON 파싱 오류:',
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
          this.logger.log(
            'Speech: 서비스 계정 키 파일을 사용하여 초기화합니다.',
          );

          if (serviceAccount.project_id) {
            clientConfig.projectId = serviceAccount.project_id;
            this.logger.log(
              `Speech: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.project_id}`,
            );
          }
        }
        // Google Cloud 기본 인증 정보 사용
        else {
          this.logger.log('Speech: 기본 인증 정보를 사용하여 초기화합니다.');
        }
      }

      this.speechClient = new SpeechClient(clientConfig);
      this.logger.log(
        `Speech 초기화 완료 (프로젝트 ID: ${clientConfig.projectId})`,
      );
    } catch (error) {
      this.logger.error('Speech 초기화 오류:', error);
      // 폴백으로 기본 설정 사용
      this.speechClient = new SpeechClient({ projectId: 'image-tool-462403' });
    }
  }

  async convertSpeechToText(
    audioBuffer: Buffer,
    languageCode: string,
  ): Promise<SpeechResult> {
    const startTime = Date.now();

    // 엄격한 검증
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty or invalid');
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
      this.logger.log(`Starting speech-to-text conversion for ${languageCode}`);
      this.logger.log(`Audio buffer size: ${audioBuffer.length} bytes`);

      // 오디오 형식 자동 감지
      const audioFormat = this.detectAudioFormat(audioBuffer);
      const sampleRate = audioFormat === 'LINEAR16' ? 16000 : 44100;

      this.logger.log(
        `Detected audio format: ${audioFormat}, sample rate: ${sampleRate}`,
      );

      // Google Cloud Speech-to-Text API 요청 설정
      const request = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: {
          encoding: audioFormat,
          sampleRateHertz: sampleRate,
          languageCode: languageCode,
          enableAutomaticPunctuation: true,
          model: 'latest_long',
        },
      };

      // Google Cloud Speech API 호출
      const [response] = await this.speechClient.recognize(request);

      let transcript = '';
      let confidence = 0;

      if (response.results && response.results.length > 0) {
        const alternatives = response.results[0].alternatives;
        if (alternatives && alternatives.length > 0) {
          transcript = alternatives[0].transcript || '';
          confidence = alternatives[0].confidence || 0;
        }
      }

      // 인식된 텍스트가 없는 경우
      if (!transcript) {
        this.logger.warn('No speech recognized in audio');
        transcript = '음성을 인식할 수 없습니다.';
        confidence = 0;
      }

      const result: SpeechResult = {
        transcript,
        confidence,
        languageCode: languageCode,
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(`Speech-to-text completed in ${processingTime}ms`);
      this.logger.log(`Recognized text: "${result.transcript}"`);
      this.logger.log(`Confidence: ${result.confidence}`);

      return result;
    } catch (error) {
      this.logger.error('Speech-to-text conversion failed:', error);

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
            throw new Error('잘못된 오디오 형식입니다.');
          case 7: // PERMISSION_DENIED
            throw new Error('Google Cloud 인증 오류입니다.');
          case 8: // RESOURCE_EXHAUSTED
            throw new Error('API 사용량 한도를 초과했습니다.');
          default:
            throw new Error('음성 인식 서비스 오류가 발생했습니다.');
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Speech conversion failed: ${message}`);
    }
  }

  private detectAudioFormat(audioBuffer: Buffer): 'MP3' | 'LINEAR16' {
    // WAV 파일 헤더 확인 (RIFF 시그니처)
    if (audioBuffer.length >= 12) {
      const riffHeader = audioBuffer.subarray(0, 4).toString('ascii');
      const waveHeader = audioBuffer.subarray(8, 12).toString('ascii');
      if (riffHeader === 'RIFF' && waveHeader === 'WAVE') {
        this.logger.log('Audio format detected: WAV (LINEAR16)');
        return 'LINEAR16';
      }
    }
    // MP3 파일 헤더 확인 (ID3 태그 또는 MP3 프레임 헤더)
    if (audioBuffer.length >= 3) {
      const id3Header = audioBuffer.subarray(0, 3).toString('ascii');
      if (id3Header === 'ID3') {
        this.logger.log('Audio format detected: MP3 (ID3 tag)');
        return 'MP3';
      }
      // MP3 프레임 헤더 확인 (0xff fb 또는 0xff fa로 시작)
      if (audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0) {
        this.logger.log('Audio format detected: MP3 (frame header)');
        return 'MP3';
      }
    }
    // 기본값은 MP3 (이전 호환성)
    this.logger.log('Audio format detected: MP3 (default fallback)');
    return 'MP3';
  }

  private async simulateProcessing(): Promise<void> {
    // API 처리 시간 시뮬레이션 (1-3초)
    const delay = Math.random() * 2000 + 1000;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
