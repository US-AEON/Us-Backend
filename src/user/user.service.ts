import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ProfileDto } from './dto/profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async updateProfile(userId: string, profileData: ProfileDto) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 프로필 정보 저장
      const profileInfo = {
        name: profileData.name,
        birthYear: profileData.birthYear,
        nationality: profileData.nationality,
        currentCity: profileData.currentCity,
        mainLanguage: profileData.mainLanguage,
        profileCompleted: true,
        updatedAt: new Date(),
      };
      
      // 사용자 정보 업데이트
      await firestore.collection('users').doc(userId).update(profileInfo);
      
      return {
        userId,
        ...profileInfo
      };
    } catch (error) {
      console.error('프로필 정보 저장 실패:', error);
      throw error;
    }
  }
} 