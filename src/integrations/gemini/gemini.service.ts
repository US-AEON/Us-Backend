import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Language, LANGUAGE_NAMES } from '../../shared/constants/language.constants';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  onModuleInit() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        this.logger.warn('Gemini API Key가 설정되지 않았습니다. 번역 기능이 작동하지 않을 수 있습니다.');
        return;
      }
      
      // Gemini API 초기화
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // 기본 모델 설정 (gemini-1.5-pro)
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro'
      });
      
      this.logger.log('Gemini API 초기화 완료');
    } catch (error) {
      this.logger.error(`Gemini API 초기화 오류: ${error.message}`);
    }
  }
  
  //한국어를 외국어로 번역
  async translateFromKorean(text: string, targetLanguage: Language): Promise<string> {
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
      return response.text();
    } catch (error) {
      this.logger.error(`번역 오류: ${error.message}`);
      throw new Error(`번역 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  
  //외국어를 한국어로 번역
  async translateToKorean(text: string, sourceLanguage: Language): Promise<string> {
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
      return response.text();
    } catch (error) {
      this.logger.error(`번역 오류: ${error.message}`);
      throw new Error(`번역 중 오류가 발생했습니다: ${error.message}`);
    }
  }
} 