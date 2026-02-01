
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  birthPlace?: string;
  age?: number;
  maritalStatus?: string;
  sacramentTypes?: string[];
  address?: string;
  phone?: string;
  completedModules: string[];
  averageScore?: number; // Nuevo campo para promedio general
}

export interface AdminUser {
  id: string;
  email: string;
  password: string | null;
  name: string;
  isSuperAdmin: boolean;
}

export interface QuizAttempt {
  id?: string;
  userId: string;
  moduleId: string;
  score: number;
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
  file?: File;
}

export interface Topic {
  id: string;
  title: string;
  videoUrl: string;
  summary: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  topics: Topic[]; 
  videoUrl?: string; 
  content?: string; 
  resources?: Resource[];
  order: number;
  questions: Question[];
}

export interface AppConfig {
  heroImage: string;
  landingBackground: string;
  primaryColor: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: number;
  type: 'info' | 'success' | 'alert' | 'message';
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
  date: string;
  location: string;
  time: string;
  duration: string;
  cost: string;
}
