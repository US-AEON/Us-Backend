import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ProfileDto } from './dto/profile.dto';
import { UserProfile } from '../auth/interfaces/user.interface';

@Injectable()
export class UserService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async updateProfile(userId: string, profileData: ProfileDto) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 계정 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 프로필 정보 준비
      const profileInfo = {
        userId: userId,
        name: profileData.name,
        birthYear: profileData.birthYear,
        nationality: profileData.nationality,
        currentCity: profileData.currentCity,
        mainLanguage: profileData.mainLanguage,
        updatedAt: new Date()
      };
      
      // 프로필 정보 저장
      const profilesRef = firestore.collection('profiles');
      
      // 기존 프로필이 있는지 확인
      const existingProfileQuery = await profilesRef.where('userId', '==', userId).limit(1).get();
      
      if (!existingProfileQuery.empty) {
        // 기존 프로필 업데이트
        const profileDoc = existingProfileQuery.docs[0];
        await profilesRef.doc(profileDoc.id).update(profileInfo);
      } else {
        // 새 프로필 생성
        await profilesRef.add(profileInfo);
      }
      
      // 사용자 계정의 profileCompleted 상태 업데이트
      await firestore.collection('users').doc(userId).update({
        profileCompleted: true,
        updatedAt: new Date()
      });
      
      return {
        ...profileInfo
      };
    } catch (error) {
      console.error('프로필 정보 저장 실패:', error);
      throw error;
    }
  }
} 