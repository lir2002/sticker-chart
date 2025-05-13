// Event interface for events table
export interface Event {
  id: number;
  date: string; // Event date in YYYY-MM-DD format
  markedAt: string; // Timestamp when event was marked
  eventType: string; // Name of the event type
  note?: string; // Optional note, up to 200 characters
  photoPath?: string; // Optional path to stored photo
  created_by?: number; // User ID of creator, references users(id)
  is_verified: number; // Verification status (0 or 1)
  creatorName?: string | null;
  weight: number;
  verified_at?: string | null; // New field
  verified_by?: number | null; // New field
  verifierName?: string | null; // New field
  owner?: number | null; // Added
  ownerName?: string | null; // Added
}

// EventType interface for event_types table
export interface EventType {
  name: string; // Max 20 characters
  icon: string; // Icon name from MaterialIcons (e.g., "event")
  iconColor: string; // Icon color (e.g., "#FF0000")
  availability: number; // Availability for one day
  owner?: number; // User ID of owner, references users(id)
  weight: number; // Face Value of achievement type, >= 1
  expiration_date?: string | null;
  created_at?: string | null;
  ownerName?: string | null;
}

// User interface for users table
export interface User {
  id: number; // Unique user ID
  name: string; // User name
  role_id: number; // Role ID, references roles(role_id)
  code: string; // User password/code
  is_active: number; // Active status (0 or 1)
  created_at: string; // Creation timestamp
  updated_at: string; // Last update timestamp
  icon?: string; // Optional path to user icon
  email?: string;
  phone?: string;
}

// Role interface for roles table
export interface Role {
  role_id: number; // Unique role ID
  role_name: string; // Role name (e.g., Admin, Guest, User)
}

// Define navigation stack parameters
export type RootStackParamList = {
  Home: undefined;
  Calendar: { eventType: string; owner: number | null; ownerName: string; icon: string | null; iconColor: string | null };
  CalendarViewAll: undefined;
  CodeSetup: undefined;
  ChangeCode: { userId: number }; // Updated to pass user ID
  TransactionHistory: { userId: number };
};

export interface Wallet {
  owner: number;
  assets: number;
  credit: number;
}

export interface Transaction {
  id: number;
  reason: string | null;
  amount: number | null;
  counterparty: number | null;
  counterpartyName?: string | null;
  timestamp: string | null;
  balance: number | null;
}

export interface DbVersion {
  version: number;
}