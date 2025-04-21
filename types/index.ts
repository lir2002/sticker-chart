export interface Event {
    id: number;
    date: string;
    markedAt: string;
    eventType: string; // Name of the event type
  }
  
export interface EventType {
    name: string; // Max 20 characters
    icon: string; // Icon name from MaterialIcons (e.g., "event")
    iconColor?: string; // Icon color (e.g., "#FF0000")
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