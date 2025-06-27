import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 카카오 idToken을 검증하고 사용자 정보를 추출
  async verifyKakaoIdToken(idToken: string) {
    try {
      // 토큰 디코딩
      const decodedToken: any = jwt.decode(idToken, { complete: true });
      
      if (!decodedToken) {
        throw new Error('유효하지 않은 토큰 형식입니다.');
      }
      
      const clientId = this.configService.get<string>('KAKAO_CLIENT_ID');
      if (clientId && decodedToken.payload.aud !== clientId) {
        console.warn('토큰의 대상(audience)이 일치하지 않습니다.');
      }
      
      return decodedToken.payload;
    } catch (error) {
      console.error('카카오 ID 토큰 검증 실패:', error);
      throw new UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
    }
  }

  // 사용자 정보를 기반으로 JWT 액세스 토큰을 생성
  async generateAccessToken(user: any) {
    const payload = {
      uid: user.uid,
      email: user.email || '',
      name: user.name || user.displayName || '',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.name || user.displayName || '',
        photoURL: user.picture || user.photoURL || '',
      }
    };
  }

  // 카카오 로그인 프로세스를 처리
  async kakaoLogin(idToken: string) {
    // 카카오 ID 토큰 검증
    const kakaoUserInfo = await this.verifyKakaoIdToken(idToken);
    
    // 사용자 정보 확인 또는 생성
    const userRecord = await this.findOrCreateKakaoUser(kakaoUserInfo);
    
    // JWT 액세스 토큰 생성
    return this.generateAccessToken(userRecord);
  }

  // 카카오 사용자 정보를 기반으로 사용자를 찾거나 생성
  private async findOrCreateKakaoUser(kakaoUserInfo: any) {
    try {
      const kakaoId = kakaoUserInfo.sub;
      const firestore = this.firebaseService.getFirestore();
      
      // 카카오 ID로 사용자 조회
      const usersRef = firestore.collection('users');
      const snapshot = await usersRef.where('kakaoId', '==', kakaoId).limit(1).get();
      
      if (!snapshot.empty) {
        // 기존 사용자 정보 반환
        const userDoc = snapshot.docs[0];
        return { uid: userDoc.id, ...userDoc.data() };
      } else {
        // 새 사용자 정보 생성
        const newUser = {
          kakaoId: kakaoId,
          email: kakaoUserInfo.email || '',
          displayName: kakaoUserInfo.nickname || '',
          photoURL: kakaoUserInfo.picture || '',
          provider: 'kakao',
          createdAt: new Date(),
        };

        // Firestore에 사용자 정보 저장
        const userRef = await firestore.collection('users').add(newUser);
        
        return { uid: userRef.id, ...newUser };
      }
    } catch (error) {
      console.error('사용자 정보 조회/생성 실패:', error);
      throw new UnauthorizedException('사용자 정보를 처리할 수 없습니다.');
    }
  }
} 