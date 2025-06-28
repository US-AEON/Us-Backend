export enum ForeignLanguage {
  ENGLISH = 'English',
  KHMER = 'ភាសាខ្មែរ',
  VIETNAMESE = 'Tiếng Việt',
}

export enum Language {
  ENGLISH = 'English',
  KHMER = 'ភាសាខ្មែរ',
  VIETNAMESE = 'Tiếng Việt',
  KOREAN = '한국어',
}

export const LANGUAGE_NAMES = {
  [Language.ENGLISH]: '영어',
  [Language.KHMER]: '크메르어',
  [Language.VIETNAMESE]: '베트남어',
  [Language.KOREAN]: '한국어',
};

export const SUPPORTED_LANGUAGES = Object.values(Language);
export const SUPPORTED_FOREIGN_LANGUAGES = Object.values(ForeignLanguage);

// Google Cloud API에서 사용하는 언어 코드 매핑
export const LANGUAGE_CODES = {
  [Language.ENGLISH]: 'en-US',
  [Language.KHMER]: 'km-KH',
  [Language.VIETNAMESE]: 'vi-VN',
  [Language.KOREAN]: 'ko-KR',
};

// 기본 언어 (한국어)
export const DEFAULT_LANGUAGE_CODE = LANGUAGE_CODES[Language.KOREAN];
export const DEFAULT_LANGUAGE_NAME = LANGUAGE_NAMES[Language.KOREAN];

export function getLanguageCode(language: Language): string {
  return LANGUAGE_CODES[language];
}

export function getLanguageName(language: Language): string {
  return LANGUAGE_NAMES[language];
}

export function getAllSupportedLanguageCodes(): string[] {
  return Object.values(LANGUAGE_CODES);
}
