import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './interfaces/comment.interface';
import { CommentResponse } from './interfaces/comment-response.interface';
import { GeminiService } from '../integrations/gemini/gemini.service';
import { Language, SUPPORTED_LANGUAGES } from '../shared/constants/language.constants';

@Injectable()
export class CommentService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly geminiService: GeminiService,
  ) {}

  // 댓글 생성
  async createComment(postId: string, createCommentDto: CreateCommentDto, userId: string): Promise<CommentResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 게시물 존재 여부 확인
      const postDoc = await firestore.collection('posts').doc(postId).get();
      if (!postDoc.exists) {
        throw new NotFoundException('게시물을 찾을 수 없습니다.');
      }
      
      // 부모 댓글 확인 (대댓글인 경우)
      if (createCommentDto.parentId) {
        const parentCommentDoc = await firestore.collection('comments').doc(createCommentDto.parentId).get();
        if (!parentCommentDoc.exists) {
          throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
        }
        
        // 부모 댓글이 이미 대댓글인지 확인
        const parentComment = parentCommentDoc.data() || {};
        if (parentComment.parentId) {
          throw new BadRequestException('대댓글에는 댓글을 달 수 없습니다.');
        }
      }
      
      // 언어 감지
      const detectedLanguage = await this.geminiService.detectLanguage(createCommentDto.content);
      
      // 모든 지원 언어로 번역
      const translations = await this.translateToAllLanguages(createCommentDto.content, detectedLanguage);
      
      // 댓글 데이터 생성
      const commentData: Omit<Comment, 'id'> = {
        postId,
        authorId: userId,
        parentId: createCommentDto.parentId,
        content: createCommentDto.content,
        detectedLanguage,
        translations,
        createdAt: new Date(),
      };
      
      // Firestore에 저장
      const commentRef = await firestore.collection('comments').add(commentData);
      
      // 사용자 프로필에서 메인 언어와 이름 가져오기
      let mainLanguage: Language = Language.ENGLISH; // 기본값
      let authorName = '사용자'; // 기본값
      const profileDoc = await firestore.collection('profiles').doc(userId).get();
      if (profileDoc.exists) {
        const profileData = profileDoc.data() || {};
        if (profileData.mainLanguage && Object.values(Language).includes(profileData.mainLanguage)) {
          mainLanguage = profileData.mainLanguage as Language;
        }
        if (profileData.name) {
          authorName = profileData.name;
        }
      }
      
      // 사용자 메인 언어에 맞는 번역본 반환
      const translatedContent = detectedLanguage === mainLanguage 
        ? undefined 
        : translations[mainLanguage];
      
      return {
        id: commentRef.id,
        authorName,
        parentId: createCommentDto.parentId,
        content: createCommentDto.content,
        translatedContent,
        detectedLanguage,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('댓글 생성 실패:', error);
      throw error;
    }
  }

  // 게시물의 모든 댓글 조회
  async getCommentsByPost(postId: string, userId: string): Promise<CommentResponse[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 게시물 존재 여부 확인
      const postDoc = await firestore.collection('posts').doc(postId).get();
      if (!postDoc.exists) {
        throw new NotFoundException('게시물을 찾을 수 없습니다.');
      }
      
      // 사용자 프로필에서 메인 언어 가져오기
      let mainLanguage: Language = Language.ENGLISH; // 기본값
      const profileDoc = await firestore.collection('profiles').doc(userId).get();
      if (profileDoc.exists) {
        const profileData = profileDoc.data() || {};
        if (profileData.mainLanguage && Object.values(Language).includes(profileData.mainLanguage)) {
          mainLanguage = profileData.mainLanguage as Language;
        }
      }
      
      // 댓글 조회
      const commentsSnapshot = await firestore
        .collection('comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .get();
      
      // 댓글 변환 및 작성자 이름 추가
      const allComments = await Promise.all(commentsSnapshot.docs.map(async doc => {
        const data = doc.data();
        
        // 작성자 이름 가져오기
        let authorName = '사용자';
        const authorProfileDoc = await firestore.collection('profiles').doc(data.authorId).get();
        if (authorProfileDoc.exists) {
          const profileData = authorProfileDoc.data() || {};
          if (profileData.name) {
            authorName = profileData.name;
          }
        }
        
        // 사용자 메인 언어에 맞는 번역본 반환
        const translatedContent = data.detectedLanguage === mainLanguage
          ? undefined
          : data.translations[mainLanguage];
        
        return {
          id: doc.id,
          authorName,
          parentId: data.parentId,
          content: data.content,
          translatedContent,
          detectedLanguage: data.detectedLanguage,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }));
      
      // 댓글을 계층 구조로 정리
      const commentMap = new Map<string, CommentResponse>();
      const rootComments: CommentResponse[] = [];
      
      // 모든 댓글을 맵에 추가
      allComments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, children: [] });
      });
      
      // 부모-자식 관계 설정
      allComments.forEach(comment => {
        const commentWithChildren = commentMap.get(comment.id);
        if (!commentWithChildren) return;
        
        if (comment.parentId) {
          // 대댓글인 경우
          const parentComment = commentMap.get(comment.parentId);
          if (parentComment) {
            if (!parentComment.children) {
              parentComment.children = [];
            }
            parentComment.children.push(commentWithChildren);
          }
        } else {
          // 최상위 댓글인 경우
          rootComments.push(commentWithChildren);
        }
      });
      
      return rootComments;
    } catch (error) {
      console.error('댓글 조회 실패:', error);
      throw error;
    }
  }

  // 모든 지원 언어로 텍스트 번역
  private async translateToAllLanguages(text: string, sourceLanguage: Language): Promise<{ [key in Language]: string }> {
    const translations: Partial<{ [key in Language]: string }> = {};
    
    // 원본 언어는 번역하지 않고 그대로 사용
    translations[sourceLanguage] = text;
    
    // 나머지 언어로 번역
    for (const targetLanguage of SUPPORTED_LANGUAGES) {
      if (targetLanguage !== sourceLanguage) {
        try {
          const translatedText = await this.geminiService.translateBetweenLanguages(
            text, 
            sourceLanguage, 
            targetLanguage
          );
          translations[targetLanguage] = translatedText;
        } catch (error) {
          console.error(`${targetLanguage}로 번역 실패:`, error);
          translations[targetLanguage] = text; // 오류 시 원본 텍스트 사용
        }
      }
    }
    
    return translations as { [key in Language]: string };
  }
} 