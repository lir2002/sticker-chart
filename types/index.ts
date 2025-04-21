export interface Event {
    id: number;
    date: string;
    markedAt: string;
    eventType: string; // Name of the event type
  }
  
export interface EventType {
    name: string; // Max 20 characters
  }
  
export interface VerificationCode {
    isSet: boolean;
    code: string | null;
  }

// Define navigation stack parameters
export type RootStackParamList = {
    Home: undefined;
    Calendar: { eventType: string };
  };