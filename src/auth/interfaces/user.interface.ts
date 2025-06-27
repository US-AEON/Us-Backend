// 기본 계정 정보 (인증 관련)
export interface UserAccount {
  uid: string;
  kakaoId: string;
  provider: string;
  createdAt: Date;
  updatedAt?: Date;
  profileCompleted: boolean;
}

// 사용자 프로필 정보
export interface UserProfile {
  userId: string;
  name: string;
  birthYear: number;
  nationality: string;
  currentCity: string;
  mainLanguage: string;
  updatedAt: Date;
} 