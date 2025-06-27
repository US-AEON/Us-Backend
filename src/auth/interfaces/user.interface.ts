export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  kakaoId?: string;
  provider?: string;
  createdAt?: Date;
} 