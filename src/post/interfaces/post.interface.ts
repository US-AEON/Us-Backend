import { Language } from '../../shared/constants/language.constants';

export interface Post {
  id: string;
  workspaceId: string;
  authorId: string;
  content: string;
  detectedLanguage: Language;
  translations: {
    [key in Language]: string;
  };
  createdAt: Date;
  updatedAt?: Date;
} 