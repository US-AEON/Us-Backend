import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  Language,
  LANGUAGE_NAMES,
} from '../../shared/constants/language.constants';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  onModuleInit() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        this.logger.warn(
          'Gemini API Key가 설정되지 않았습니다. 번역 기능이 작동하지 않을 수 있습니다.',
        );
        return;
      }

      // Gemini API 초기화
      this.genAI = new GoogleGenerativeAI(apiKey);

      // 기본 모델 설정 (gemini-1.5-pro)
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
      });

      this.logger.log('Gemini API 초기화 완료');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini API 초기화 오류: ${message}`);
    }
  }

  // 언어 감지
  async detectLanguage(text: string): Promise<Language> {
    try {
      if (!this.model) {
        throw new Error('Gemini 모델이 초기화되지 않았습니다.');
      }

      const prompt = `다음 텍스트의 언어를 감지하고 다음 목록에서 언어만 응답해주세요: ${Object.values(Language).join(', ')}
텍스트: "${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text().trim();

      // 응답에서 언어 찾기
      const detectedLanguage = Object.values(Language).find(
        lang => responseText.toLowerCase().includes(lang.toLowerCase())
      );

      return detectedLanguage || Language.ENGLISH;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`언어 감지 오류: ${message}`);
      return Language.ENGLISH;
    }
  }

  // 언어 간 번역
  async translateBetweenLanguages(
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language,
  ): Promise<string> {
    try {
      if (!this.model) {
        throw new Error('Gemini 모델이 초기화되지 않았습니다.');
      }

      const sourceLanguageName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
      const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

      const prompt = `다음 ${sourceLanguageName} 텍스트를 ${targetLanguageName}로 번역해주세요. 번역된 텍스트만 반환하세요:

"${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text().replace(/\n/g, ' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`번역 오류: ${message}`);
      throw new Error(`번역 중 오류가 발생했습니다: ${message}`);
    }
  }

  //한국어를 외국어로 번역
  async translateFromKorean(
    text: string,
    targetLanguage: Language,
  ): Promise<string> {
    try {
      if (!this.model) {
        throw new Error('Gemini 모델이 초기화되지 않았습니다.');
      }

      const languageName = LANGUAGE_NAMES[targetLanguage];
      const nativeLanguageName = targetLanguage;

      const prompt = `다음 한국어 텍스트를 ${languageName}(${nativeLanguageName})로 번역해주세요. 번역된 텍스트만 반환하세요:

"${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text().replace(/\n/g, ' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`번역 오류: ${message}`);
      throw new Error(`번역 중 오류가 발생했습니다: ${message}`);
    }
  }

  //외국어를 한국어로 번역
  async translateToKorean(
    text: string,
    sourceLanguage: Language,
  ): Promise<string> {
    try {
      if (!this.model) {
        throw new Error('Gemini 모델이 초기화되지 않았습니다.');
      }

      const languageName = LANGUAGE_NAMES[sourceLanguage];
      const nativeLanguageName = sourceLanguage;

      const prompt = `다음 ${languageName}(${nativeLanguageName}) 텍스트를 한국어로 번역해주세요. 번역된 텍스트만 반환하세요:

"${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text().replace(/\n/g, ' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`번역 오류: ${message}`);
      throw new Error(`번역 중 오류가 발생했습니다: ${message}`);
    }
  }

  // 커스텀 프롬프트로 생성
  async generateWithPrompt(prompt: string): Promise<string> {
    try {
      if (!this.model) {
        throw new Error('Gemini 모델이 초기화되지 않았습니다.');
      }

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text().replace(/\n/g, ' ').trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini 생성 오류: ${message}`);
      throw new Error(`텍스트 생성 중 오류가 발생했습니다: ${message}`);
    }
  }
}
