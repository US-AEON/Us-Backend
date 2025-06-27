import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UserAccount } from './interfaces/user.interface';

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
  async generateAccessToken(user: { uid: string }) {
    const payload = {
      uid: user.uid,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '1h',
    });
  }

  // 사용자 정보를 기반으로 JWT 리프레시 토큰을 생성
  async generateRefreshToken(user: { uid: string }) {
    const payload = {
      uid: user.uid,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // 리프레시 토큰을 Firestore에 저장
    try {
      const firestore = this.firebaseService.getFirestore();
      await firestore.collection('refreshTokens').doc(user.uid).set({
        token: refreshToken,
        createdAt: new Date(),
        userId: user.uid,
      });
    } catch (error) {
      console.error('리프레시 토큰 저장 실패:', error);
    }

    return refreshToken;
  }

  // 리프레시 토큰을 검증하고 새 액세스 토큰을 발급
  async refreshAccessToken(refreshToken: string) {
    try {
      // 리프레시 토큰 검증
      const decoded: any = this.jwtService.verify(refreshToken);
      
      // 타입 확인
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      }
      
      // Firestore에서 저장된 리프레시 토큰 확인
      const firestore = this.firebaseService.getFirestore();
      const tokenDoc = await firestore.collection('refreshTokens').doc(decoded.uid).get();
      
      if (!tokenDoc.exists || tokenDoc.data()?.token !== refreshToken) {
        throw new UnauthorizedException('만료되었거나 유효하지 않은 리프레시 토큰입니다.');
      }
      
      // 사용자 정보 조회
      const userDoc = await firestore.collection('users').doc(decoded.uid).get();
      
      if (!userDoc.exists) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }
      
      const user = { uid: userDoc.id };
      
      // 새 액세스 토큰 발급
      const accessToken = await this.generateAccessToken(user);
      
      return {
        access_token: accessToken
      };
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      throw new UnauthorizedException('토큰을 갱신할 수 없습니다.');
    }
  }

  // 로그아웃
  async logout(userId: string) {
    try {
      const firestore = this.firebaseService.getFirestore();
      const tokenDoc = await firestore.collection('refreshTokens').doc(userId).get();
      
      if (!tokenDoc.exists) {
        throw new NotFoundException('로그인 정보를 찾을 수 없습니다.');
      }
      
      // 리프레시 토큰 삭제
      await firestore.collection('refreshTokens').doc(userId).delete();
      
      return {
        success: true,
        message: '로그아웃 되었습니다.'
      };
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }

  // 카카오 로그인 프로세스를 처리
  async kakaoLogin(idToken: string) {
    // 카카오 ID 토큰 검증
    const kakaoUserInfo = await this.verifyKakaoIdToken(idToken);
    
    // 사용자 정보 확인 또는 생성
    const userRecord = await this.findOrCreateKakaoUser(kakaoUserInfo);
    
    // JWT 토큰 생성
    const accessToken = await this.generateAccessToken(userRecord);
    const refreshToken = await this.generateRefreshToken(userRecord);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        uid: userRecord.uid
      }
    };
  }

  // 카카오 사용자 정보를 기반으로 사용자를 찾거나 생성
  private async findOrCreateKakaoUser(kakaoUserInfo: any): Promise<UserAccount> {
    try {
      const kakaoId = kakaoUserInfo.sub;
      const firestore = this.firebaseService.getFirestore();
      
      // 카카오 ID로 사용자 조회
      const usersRef = firestore.collection('users');
      const snapshot = await usersRef.where('kakaoId', '==', kakaoId).limit(1).get();
      
      if (!snapshot.empty) {
        // 기존 사용자 정보 반환
        const userDoc = snapshot.docs[0];
        return { uid: userDoc.id, ...userDoc.data() } as UserAccount;
      } else {
        // 새 사용자 정보 생성
        const newUser: Omit<UserAccount, 'uid'> = {
          kakaoId: kakaoId,
          provider: 'kakao',
          createdAt: new Date(),
          profileCompleted: false
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