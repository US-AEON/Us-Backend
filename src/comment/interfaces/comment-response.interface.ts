import { Language } from '../../shared/constants/language.constants';

export interface CommentResponse {
  id: string;
  authorName: string;
  parentId?: string;
  content: string;
  translatedContent?: string;
  detectedLanguage: Language;
  createdAt: Date;
  updatedAt?: Date;
  children?: CommentResponse[];
}