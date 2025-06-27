export enum Language {
  ENGLISH = 'English',
  KHMER = 'ភាសាខ្មែរ',
  VIETNAMESE = 'Tiếng Việt'
}

export const LANGUAGE_NAMES = {
  [Language.ENGLISH]: '영어',
  [Language.KHMER]: '크메르어',
  [Language.VIETNAMESE]: '베트남어'
};

export const SUPPORTED_LANGUAGES = Object.values(Language); 