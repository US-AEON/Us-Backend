import { Language } from '../../shared/constants/language.constants';

export interface PostResponse {
  id: string;
  authorName: string;
  content: string;
  translatedContent?: string;
  detectedLanguage: Language;
  createdAt: Date;
  updatedAt?: Date;
}