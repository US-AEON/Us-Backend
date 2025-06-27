import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    try {
      // 프로젝트 ID
      const projectId = process.env.FIREBASE_PROJECT_ID || 'us-code-3f1fa';
      
      let credential;
      let firebaseConfig: admin.AppOptions = {
        projectId: projectId
      };
      
      // 환경 변수에서 직접 서비스 계정 키 JSON 참조
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          credential = admin.credential.cert(serviceAccount);
          console.log('Firebase: 환경 변수의 서비스 계정 키 JSON을 사용하여 초기화합니다.');
          
          // 서비스 계정에서 프로젝트 ID를 가져와 명시적으로 설정
          if (serviceAccount.project_id) {
            firebaseConfig.projectId = serviceAccount.project_id;
            console.log(`Firebase: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.project_id}`);
          }
        } catch (e) {
          console.error('Firebase: 환경 변수의 서비스 계정 키 JSON 파싱 오류:', e);
        }
      } 
      // 서비스 계정 키 파일 경로를 사용하는 방법 (로컬 개발 환경)
      else {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
          || path.join(process.cwd(), 'service-account.json');
          
        if (fs.existsSync(serviceAccountPath)) {
          // 파일에서 서비스 계정 키 로드
          const serviceAccount = require(serviceAccountPath);
          credential = admin.credential.cert(serviceAccount);
          console.log('Firebase: 서비스 계정 키 파일을 사용하여 초기화합니다.');
          
          // 서비스 계정에서 프로젝트 ID를 가져와 명시적으로 설정
          if (serviceAccount.project_id) {
            firebaseConfig.projectId = serviceAccount.project_id;
            console.log(`Firebase: 서비스 계정에서 프로젝트 ID를 설정합니다: ${serviceAccount.project_id}`);
          }
        } 
        // Google Cloud 기본 인증 정보 사용
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          credential = admin.credential.applicationDefault();
          console.log('Firebase: GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 사용하여 초기화합니다.');
        } 
        // 완전히 기본 인증 방식 사용
        else {
          credential = admin.credential.applicationDefault();
          console.log('Firebase: 기본 인증 정보를 사용하여 초기화합니다.');
        }
      }

      // 인증 정보 설정
      firebaseConfig.credential = credential;

      // Firebase 초기화
      admin.initializeApp(firebaseConfig);
      
      console.log(`Firebase 초기화 완료 (프로젝트 ID: ${firebaseConfig.projectId})`);
    } catch (error) {
      console.error('Firebase 초기화 오류:', error);
    }
  }

  getFirebaseAdmin() {
    return admin;
  }

  getFirestore() {
    return admin.firestore();
  }
} 