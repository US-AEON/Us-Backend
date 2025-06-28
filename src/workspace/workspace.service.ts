import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { Workspace } from './interfaces/workspace.interface';

@Injectable()
export class WorkspaceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  // 워크스페이스 생성
  async createWorkspace(createWorkspaceDto: CreateWorkspaceDto, userId: string): Promise<Workspace> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 사용자가 이미 워크스페이스에 속해있는지 확인
      const userData = userDoc.data() || {};
      if (userData.workspaceId) {
        throw new ConflictException('이미 워크스페이스에 속해 있습니다.');
      }
      
      // 고유한 참여 코드 생성
      const code = this.generateUniqueCode();
      
      // 워크스페이스 생성
      const workspaceData: Omit<Workspace, 'id'> = {
        title: createWorkspaceDto.title,
        code,
        createdBy: userId,
        createdAt: new Date()
      };
      
      // Firestore에 저장
      const workspaceRef = await firestore.collection('workspaces').add(workspaceData);
      const workspaceId = workspaceRef.id;
      
      // 사용자 정보 업데이트
      await firestore.collection('users').doc(userId).update({
        workspaceId,
        updatedAt: new Date()
      });
      
      return {
        id: workspaceId,
        ...workspaceData
      };
    } catch (error) {
      console.error('워크스페이스 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 워크스페이스 참여
   */
  async joinWorkspace(joinWorkspaceDto: JoinWorkspaceDto, userId: string): Promise<Workspace> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 존재 여부 확인
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      // 사용자가 이미 워크스페이스에 속해있는지 확인
      const userData = userDoc.data() || {};
      if (userData.workspaceId) {
        throw new ConflictException('이미 워크스페이스에 속해 있습니다.');
      }
      
      // 참여 코드로 워크스페이스 조회
      const workspacesRef = firestore.collection('workspaces');
      const snapshot = await workspacesRef.where('code', '==', joinWorkspaceDto.code).limit(1).get();
      
      if (snapshot.empty) {
        throw new NotFoundException('유효하지 않은 참여 코드입니다.');
      }
      
      const workspaceDoc = snapshot.docs[0];
      const workspaceId = workspaceDoc.id;
      const workspaceData = workspaceDoc.data() || {};
      
      // 사용자 정보 업데이트
      await firestore.collection('users').doc(userId).update({
        workspaceId,
        updatedAt: new Date()
      });
      
      return {
        id: workspaceId,
        title: workspaceData.title,
        code: workspaceData.code,
        createdBy: workspaceData.createdBy,
        createdAt: workspaceData.createdAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('워크스페이스 참여 실패:', error);
      throw error;
    }
  }

  /**
   * 현재 사용자의 워크스페이스 조회
   */
  async getCurrentWorkspace(userId: string): Promise<Workspace> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 정보 조회
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      const userData = userDoc.data() || {};
      if (!userData.workspaceId) {
        throw new NotFoundException('속한 워크스페이스가 없습니다.');
      }
      
      // 워크스페이스 정보 조회
      const workspaceDoc = await firestore.collection('workspaces').doc(userData.workspaceId).get();
      if (!workspaceDoc.exists) {
        throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
      }
      
      const workspaceData = workspaceDoc.data() || {};
      
      return {
        id: workspaceDoc.id,
        title: workspaceData.title,
        code: workspaceData.code,
        createdBy: workspaceData.createdBy,
        createdAt: workspaceData.createdAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('워크스페이스 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 워크스페이스 나가기
   */
  async leaveWorkspace(userId: string): Promise<void> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 사용자 정보 조회
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      
      const userData = userDoc.data() || {};
      if (!userData.workspaceId) {
        throw new BadRequestException('속한 워크스페이스가 없습니다.');
      }
      
      // 워크스페이스 정보 업데이트
      await firestore.collection('users').doc(userId).update({
        workspaceId: null,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('워크스페이스 나가기 실패:', error);
      throw error;
    }
  }

  /**
   * 고유한 참여 코드 생성
   */
  private generateUniqueCode(): string {
    // 6자리 영문+숫자 조합 코드 생성
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    
    return code;
  }
} 