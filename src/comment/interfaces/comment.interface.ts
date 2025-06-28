import { Language } from '../../shared/constants/language.constants';

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  detectedLanguage: Language;
  translations: {
    [key in Language]: string;
  };
  createdAt: Date;
  updatedAt?: Date;
} 