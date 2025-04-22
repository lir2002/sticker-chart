export interface Event {
    id: number;
    date: string;
    markedAt: string;
    eventType: string; // Name of the event type
    note?: string; // Optional note, up to 200 characters
    photoPath?: string; // Optional path to stored photo
  }
  
export interface EventType {
    name: string; // Max 20 characters
    icon: string; // Icon name from MaterialIcons (e.g., "event")
    iconColor: string; // Icon color (e.g., "#FF0000")
  }
  
export interface VerificationCode {
    isSet: boolean;
    code: string | null;
  }

// Define navigation stack parameters
export type RootStackParamList = {
    Home: undefined;
    Calendar: { eventType: string };
    CalendarViewAll: undefined;
  };