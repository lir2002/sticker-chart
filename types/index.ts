export interface Event {
    id: number;
    date: string;
    markedAt: string;
  }
  
export interface VerificationCode {
    isSet: boolean;
    code: string | null;
  }