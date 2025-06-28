import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './interfaces/post.interface';
import { PostResponse } from './interfaces/post-response.interface';
import { GeminiService } from '../integrations/gemini/gemini.service';
import { Language, SUPPORTED_LANGUAGES } from '../shared/constants/language.constants';

@Injectable()
export class PostService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly geminiService: GeminiService,
  ) {}

  // 게시물 생성
  async createPost(createPostDto: CreatePostDto, userId: string): Promise<PostResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자의 워크스페이스 ID와 메인 언어 조회
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      const userData = userDoc.data() || {};
      if (!userData.workspaceId) {
        throw new NotFoundException('워크스페이스에 속해있지 않습니다.');
      }
      
      const workspaceId = userData.workspaceId;
      
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
      
      // 워크스페이스 존재 여부 확인
      const workspaceDoc = await firestore.collection('workspaces').doc(workspaceId).get();
      if (!workspaceDoc.exists) {
        throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
      }
      
      // 언어 감지
      const detectedLanguage = await this.geminiService.detectLanguage(createPostDto.content);
      
      // 모든 지원 언어로 번역
      const translations = await this.translateToAllLanguages(createPostDto.content, detectedLanguage);
      
      // 게시물 데이터 생성
      const postData: Omit<Post, 'id'> = {
        workspaceId,
        authorId: userId,
        content: createPostDto.content,
        detectedLanguage,
        translations,
        createdAt: new Date(),
      };
      
      // Firestore에 저장
      const postRef = await firestore.collection('posts').add(postData);
      
      // 사용자 메인 언어에 맞는 번역본 반환 (같은 언어면 undefined)
      const translatedContent = detectedLanguage === mainLanguage 
        ? undefined 
        : translations[mainLanguage];
      
      return {
        id: postRef.id,
        authorName,
        content: createPostDto.content,
        translatedContent,
        detectedLanguage,
        commentCount: 0, // 새 게시물이므로 댓글 수는 0
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('게시물 생성 실패:', error);
      throw error;
    }
  }

  // 사용자의 워크스페이스 게시물 조회
  async getPostsByUser(userId: string): Promise<PostResponse[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자의 워크스페이스 ID 조회
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      const userData = userDoc.data() || {};
      if (!userData.workspaceId) {
        throw new NotFoundException('워크스페이스에 속해있지 않습니다.');
      }
      
      const workspaceId = userData.workspaceId;
      
      // 사용자 프로필에서 메인 언어 가져오기
      let mainLanguage: Language = Language.ENGLISH; // 기본값
      const profileDoc = await firestore.collection('profiles').doc(userId).get();
      if (profileDoc.exists) {
        const profileData = profileDoc.data() || {};
        if (profileData.mainLanguage && Object.values(Language).includes(profileData.mainLanguage)) {
          mainLanguage = profileData.mainLanguage as Language;
        }
      }
      
      // 게시물 조회
      const posts = await this.getPostsByWorkspace(workspaceId);
      
      // 사용자 메인 언어에 맞는 번역본 반환 (같은 언어면 undefined)
      const postResponses = await Promise.all(posts.map(async post => {
        const translatedContent = post.detectedLanguage === mainLanguage 
          ? undefined 
          : post.translations[mainLanguage];
        
        // 작성자 이름 가져오기
        let authorName = '사용자';
        const authorProfileDoc = await firestore.collection('profiles').doc(post.authorId).get();
        if (authorProfileDoc.exists) {
          const profileData = authorProfileDoc.data() || {};
          if (profileData.name) {
            authorName = profileData.name;
          }
        }
        
        // 댓글 수 계산
        const commentCount = await this.getCommentCountForPost(post.id);
        
        return {
          id: post.id,
          authorName,
          content: post.content,
          translatedContent,
          detectedLanguage: post.detectedLanguage,
          commentCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      }));
      
      return postResponses;
    } catch (error) {
      console.error('게시물 조회 실패:', error);
      throw error;
    }
  }

  // 워크스페이스의 모든 게시물 조회
  async getPostsByWorkspace(workspaceId: string): Promise<Post[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 워크스페이스 존재 여부 확인
      const workspaceDoc = await firestore.collection('workspaces').doc(workspaceId).get();
      if (!workspaceDoc.exists) {
        throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
      }
      
      // 게시물 조회
      const postsSnapshot = await firestore
        .collection('posts')
        .where('workspaceId', '==', workspaceId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return postsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          workspaceId: data.workspaceId,
          authorId: data.authorId,
          content: data.content,
          detectedLanguage: data.detectedLanguage,
          translations: data.translations,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      });
    } catch (error) {
      console.error('게시물 조회 실패:', error);
      throw error;
    }
  }

  // 게시물 상세 조회
  async getPostById(postId: string, userId: string): Promise<PostResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 게시물 조회
      const postDoc = await firestore.collection('posts').doc(postId).get();
      if (!postDoc.exists) {
        throw new NotFoundException('게시물을 찾을 수 없습니다.');
      }
      
      const postData = postDoc.data() || {};
      
      // 사용자가 해당 워크스페이스에 속해 있는지 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      const userData = userDoc.data() || {};
      if (!userData.workspaceId || userData.workspaceId !== postData.workspaceId) {
        throw new NotFoundException('접근 권한이 없습니다.');
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
      
      // 작성자 이름 가져오기
      let authorName = '사용자';
      const authorProfileDoc = await firestore.collection('profiles').doc(postData.authorId).get();
      if (authorProfileDoc.exists) {
        const profileData = authorProfileDoc.data() || {};
        if (profileData.name) {
          authorName = profileData.name;
        }
      }
      
      // 사용자 메인 언어에 맞는 번역본 반환 (같은 언어면 undefined)
      const translatedContent = postData.detectedLanguage === mainLanguage 
        ? undefined 
        : postData.translations[mainLanguage];
      
      // 댓글 수 계산
      const commentCount = await this.getCommentCountForPost(postDoc.id);
      
      return {
        id: postDoc.id,
        authorName,
        content: postData.content,
        translatedContent,
        detectedLanguage: postData.detectedLanguage,
        commentCount,
        createdAt: postData.createdAt.toDate(),
        updatedAt: postData.updatedAt?.toDate(),
      };
    } catch (error) {
      console.error('게시물 조회 실패:', error);
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

  // 특정 게시물의 댓글 수 계산
  private async getCommentCountForPost(postId: string): Promise<number> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 게시물의 댓글 수 조회
      const commentsSnapshot = await firestore
        .collection('comments')
        .where('postId', '==', postId)
        .get();
      
      return commentsSnapshot.size;
    } catch (error) {
      console.error('댓글 수 조회 실패:', error);
      return 0; // 오류 시 0 반환
    }
  }
} 