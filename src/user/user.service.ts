import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ProfileDto } from './dto/profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getUserProfile(userId: string) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 계정 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 프로필 정보 조회
      const profilesRef = firestore.collection('profiles');
      const profileQuery = await profilesRef.where('userId', '==', userId).limit(1).get();
      
      if (profileQuery.empty) {
        // 프로필이 없는 경우 에러 응답
        throw new NotFoundException('프로필이 아직 생성되지 않았습니다. 먼저 프로필을 생성해주세요.');
      }
      
      // 프로필 정보 반환
      const profileData = profileQuery.docs[0].data();
      
      return {
        success: true,
        data: {
          userId,
          name: profileData.name,
          birthYear: profileData.birthYear,
          nationality: profileData.nationality,
          currentCity: profileData.currentCity,
          mainLanguage: profileData.mainLanguage
        }
      };
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      throw error;
    }
  }

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

  async updateUserProfile(userId: string, updateData: UpdateUserProfileDto) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 최소 하나의 필드는 있어야 함
      if (!updateData.currentCity && !updateData.mainLanguage) {
        throw new BadRequestException('업데이트할 프로필 정보가 없습니다.');
      }
      
      // 사용자 계정 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 사용자 프로필 존재 여부 확인
      const profilesRef = firestore.collection('profiles');
      const profileQuery = await profilesRef.where('userId', '==', userId).limit(1).get();
      
      if (profileQuery.empty) {
        // 프로필이 없으면 기본 프로필 생성
        const defaultProfile = {
          userId: userId,
          name: '', 
          birthYear: null, 
          nationality: '', 
          currentCity: updateData.currentCity || '',
          mainLanguage: updateData.mainLanguage || '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await profilesRef.add(defaultProfile);
        
        // 사용자 계정의 profileCompleted 상태 업데이트 
        await firestore.collection('users').doc(userId).update({
          profileCompleted: false, 
          updatedAt: new Date()
        });
        
        return {
          success: true,
          message: '프로필이 생성되고 정보가 업데이트되었습니다.',
          data: defaultProfile
        };
      }
      
      // 업데이트할 필드 준비
      const updateFields: { [key: string]: any } = {
        updatedAt: new Date()
      };
      
      if (updateData.currentCity) {
        updateFields.currentCity = updateData.currentCity;
      }
      
      if (updateData.mainLanguage) {
        updateFields.mainLanguage = updateData.mainLanguage;
      }
      
      // 프로필 업데이트
      const profileDoc = profileQuery.docs[0];
      await profilesRef.doc(profileDoc.id).update(updateFields);
      
      // 업데이트된 프로필 정보 반환
      const updatedProfile = await profilesRef.doc(profileDoc.id).get();
      
      return {
        success: true,
        message: '프로필 정보가 업데이트되었습니다.',
        data: updatedProfile.data()
      };
    } catch (error) {
      console.error('프로필 정보 업데이트 실패:', error);
      throw error;
    }
  }
} 