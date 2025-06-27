import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('firebase-test')
  async testFirebase(): Promise<any> {
    try {
      // Firebase Admin SDK 인스턴스 가져오기
      const admin = this.firebaseService.getFirebaseAdmin();
      
      // Firestore 인스턴스 가져오기
      const firestore = this.firebaseService.getFirestore();
      
      // 테스트 컬렉션에 문서 추가 시도
      const testDoc = await firestore.collection('test').add({
        message: 'Firebase 연결 테스트',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      
      // 방금 생성한 문서 읽어오기
      const docSnapshot = await testDoc.get();
      
      return {
        status: 'success',
        message: 'Firebase Firestore 연결 성공!',
        documentId: testDoc.id,
        documentData: docSnapshot.data(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Firebase 연결 오류:', error);
      return {
        status: 'error',
        message: 'Firebase 연결 실패',
        error: error.message,
      };
    }
  }
}
