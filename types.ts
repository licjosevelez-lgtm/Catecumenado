
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean; // New flag for RBAC
  // Registration fields
  birthPlace?: string;
  age?: number; // Changed from birthDate
  maritalStatus?: string; // New field
  sacramentTypes?: string[]; // Changed to array for multi-select
  address?: string;
  phone?: string;
  completedModules: string[]; // Array of Module IDs
}

// Internal Interface for Admin Auth Logic
export interface AdminUser {
  id: string;
  email: string;
  password: string | null; // null = New User / Reset
  name: string;
  isSuperAdmin: boolean;
}

export interface QuizAttempt {
  moduleId: string;
  score: number; // 0-100
  timestamp: number;
  passed: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Resource {
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'link';
  file?: File; // Optional property to hold the actual file object during upload simulation
}

export interface Topic {
  id: string;
  title: string;
  videoUrl: string; // YouTube Embed ID or full URL
  summary: string;
}

export interface Module {
  id: string;
  title: string;
  description: string; // Used as the "Objective" or short intro
  imageUrl?: string; // Cover image
  
  // New Structure
  topics: Topic[]; 
  
  // Legacy fields (kept optional for type safety during migration, but UI will focus on topics)
  videoUrl?: string; 
  content?: string; 

  resources?: Resource[]; // Downloadable files
  order: number;
  questions: Question[];
}

export interface AppConfig {
  heroImage: string;
  landingBackground: string; // New field for Landing Page
  primaryColor: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: number;
  type: 'info' | 'success' | 'alert' | 'message'; // Added 'message' for admin broadcasts
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  importance: 'normal' | 'high';
  sentAt: number;
  recipientsCount: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  location: string;
  time: string;
  duration: string;
  cost: string;
}
