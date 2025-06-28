// 표준 인터페이스
export interface StandardResponse<T> {
  // 요청 성공 여부
  success: boolean;
  
  // 응답 메시지
  message: string;
  
  // 응답 데이터
  data: T;
} 