export enum Language {
  ENGLISH = 'English',
  KHMER = 'ភាសាខ្មែរ',
  VIETNAMESE = 'Tiếng Việt',
}

export const LANGUAGE_NAMES = {
  [Language.ENGLISH]: '영어',
  [Language.KHMER]: '크메르어',
  [Language.VIETNAMESE]: '베트남어',
};

export const SUPPORTED_LANGUAGES = Object.values(Language);

// Google Cloud API에서 사용하는 언어 코드 매핑
export const LANGUAGE_CODES = {
  [Language.ENGLISH]: 'en-US',
  [Language.KHMER]: 'km-KH',
  [Language.VIETNAMESE]: 'vi-VN',
};

// 기본 언어 (한국어 추가 - 시스템 기본값)
export const DEFAULT_LANGUAGE_CODE = 'ko-KR';
export const DEFAULT_LANGUAGE_NAME = '한국어';

export function getLanguageCode(language: Language): string {
  return LANGUAGE_CODES[language];
}

export function getLanguageName(language: Language): string {
  return LANGUAGE_NAMES[language];
}

export function getAllSupportedLanguageCodes(): string[] {
  return [DEFAULT_LANGUAGE_CODE, ...Object.values(LANGUAGE_CODES)];
}
