
import { User, UserRole, Module, QuizAttempt, AppConfig, Notification, AdminUser, Broadcast, CalendarEvent } from '../types';

// Initial Data
const INITIAL_MODULES: Module[] = [
  {
    id: 'm1',
    title: 'Historia de la Salvación',
    description: 'Conocer el plan de amor de Dios a través de la historia.',
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1000',
    content: '', 
    videoUrl: '', 
    topics: [
      {
        id: 't1',
        title: 'La Creación y la Caída',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        summary: 'Dios creó el mundo por amor, pero el pecado rompió esa armonía original. El hombre decidió vivir sin Dios.'
      },
      {
        id: 't2',
        title: 'La Alianza con Abraham',
        videoUrl: 'https://www.youtube.com/watch?v=example2',
        summary: 'Dios elige a un pueblo para preparar la llegada del Salvador. Abraham es el padre de la fe.'
      }
    ],
    order: 1,
    resources: [
      { name: 'Libro_Historia_Salvacion.pdf', url: '#', type: 'pdf' },
    ],
    questions: [
      { id: 'q1', text: '¿Quién es el centro de la Historia de la Salvación?', options: ['Moisés', 'Abraham', 'Jesucristo', 'David'], correctIndex: 2 },
      { id: 'q2', text: '¿Con qué evento comienza la Biblia?', options: ['El Éxodo', 'La Creación', 'La Resurrección', 'El Diluvio'], correctIndex: 1 },
      { id: 'q3', text: '¿Qué pueblo eligió Dios?', options: ['Egipto', 'Israel', 'Roma', 'Babilonia'], correctIndex: 1 },
    ]
  },
  {
    id: 'm2',
    title: 'Vida en el Espíritu',
    description: 'Descubrir la fuerza del Espíritu Santo en tu vida diaria.',
    imageUrl: 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=1000',
    content: '',
    videoUrl: '',
    topics: [
      {
        id: 't1',
        title: '¿Quién es el Espíritu Santo?',
        videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        summary: 'El Espíritu Santo es la tercera persona de la Trinidad. Nos da fuerza, consuelo y guía.'
      }
    ],
    order: 2,
    resources: [],
    questions: [
      { id: 'q1', text: '¿Cuándo descendió el Espíritu Santo sobre los apóstoles?', options: ['Navidad', 'Pascua', 'Pentecostés', 'Adviento'], correctIndex: 2 },
      { id: 'q2', text: '¿Cuál NO es un fruto del Espíritu?', options: ['Amor', 'Paz', 'Egoísmo', 'Alegría'], correctIndex: 2 },
    ]
  },
  {
    id: 'm3',
    title: 'Sacramentos',
    description: 'Entender los signos eficaces de la gracia.',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=1000',
    content: '',
    topics: [
      {
        id: 't1',
        title: 'Introducción a los Sacramentos',
        videoUrl: 'J---aiyznGQ',
        summary: 'Los sacramentos son signos sensibles, instituidos por Cristo, para darnos la gracia.'
      }
    ],
    order: 3,
    resources: [],
    questions: [
      { id: 'q1', text: '¿Cuántos sacramentos hay?', options: ['3', '7', '10', '5'], correctIndex: 1 },
      { id: 'q2', text: '¿Cuál es el primer sacramento?', options: ['Eucaristía', 'Confirmación', 'Bautismo', 'Orden Sacerdotal'], correctIndex: 2 },
    ]
  },
  {
    id: 'm4',
    title: 'Liturgia',
    description: 'Participar en la celebración del misterio de Cristo.',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d8e5b5a45742?auto=format&fit=crop&q=80&w=1000',
    content: '',
    topics: [],
    order: 4,
    resources: [],
    questions: [
      { id: 'q1', text: '¿Qué significa Eucaristía?', options: ['Sacrificio', 'Acción de gracias', 'Reunión', 'Cena'], correctIndex: 1 },
      { id: 'q2', text: '¿Cuál es el color litúrgico de la esperanza?', options: ['Rojo', 'Verde', 'Morado', 'Blanco'], correctIndex: 1 },
    ]
  }
];

// Initial Super Admin (Hardcoded as per requirement)
const INITIAL_ADMIN_DATA: AdminUser[] = [
  {
    id: 'super-admin-1',
    name: 'José Vélez',
    email: 'lic.jose.velez@hotmail.com',
    password: null, // Needs setup
    isSuperAdmin: true
  }
];

// Exporting null for App initial state (removed dev auto-login)
export const INITIAL_ADMIN = null;

// LocalStorage Keys
const KEY_USERS = 'lms_users';
const KEY_ADMINS = 'lms_admins'; // New key for secure admins
const KEY_ATTEMPTS = 'lms_attempts';
const KEY_CONFIG = 'lms_config';
const KEY_MODULES = 'lms_modules';
const KEY_NOTIFICATIONS = 'lms_notifications';
const KEY_BROADCASTS = 'lms_broadcasts';
const KEY_EVENTS = 'lms_events';

// Helper to simulate delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const MockService = {
  // --- Admin Auth & Management ---
  
  getAdminList: async (): Promise<AdminUser[]> => {
    await delay(200);
    const stored = localStorage.getItem(KEY_ADMINS);
    if (!stored) {
      localStorage.setItem(KEY_ADMINS, JSON.stringify(INITIAL_ADMIN_DATA));
      return INITIAL_ADMIN_DATA;
    }
    return JSON.parse(stored);
  },

  checkAdminStatus: async (email: string): Promise<{ status: 'NOT_FOUND' | 'NEEDS_SETUP' | 'ACTIVE', name?: string }> => {
    await delay(500);
    const admins = await MockService.getAdminList();
    const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
    
    if (!admin) return { status: 'NOT_FOUND' };
    if (admin.password === null) return { status: 'NEEDS_SETUP', name: admin.name };
    return { status: 'ACTIVE', name: admin.name };
  },

  loginAdmin: async (email: string, password?: string): Promise<User> => {
    await delay(600);
    const admins = await MockService.getAdminList();
    const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());

    if (!admin) throw new Error("Administrador no encontrado");

    // Case 1: Active user logging in
    if (admin.password !== null) {
      if (admin.password !== password) throw new Error("Contraseña incorrecta");
    } 
    // Case 2: User trying to login without setup (should use setup method, but handled here for safety)
    else {
      throw new Error("La cuenta requiere configuración de contraseña.");
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: UserRole.ADMIN,
      isSuperAdmin: admin.isSuperAdmin,
      completedModules: []
    };
  },

  setupAdminPassword: async (email: string, newPassword: string): Promise<User> => {
    await delay(800);
    const admins = await MockService.getAdminList();
    const index = admins.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    
    if (index === -1) throw new Error("Usuario no encontrado");
    
    admins[index].password = newPassword;
    localStorage.setItem(KEY_ADMINS, JSON.stringify(admins));

    return {
      id: admins[index].id,
      name: admins[index].name,
      email: admins[index].email,
      role: UserRole.ADMIN,
      isSuperAdmin: admins[index].isSuperAdmin,
      completedModules: []
    };
  },

  inviteAdmin: async (name: string, email: string): Promise<void> => {
    await delay(500);
    const admins = await MockService.getAdminList();
    
    if (admins.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Este correo ya es administrador");
    }

    const newAdmin: AdminUser = {
      id: Date.now().toString(),
      name,
      email,
      password: null, // Starts as null
      isSuperAdmin: false
    };

    admins.push(newAdmin);
    localStorage.setItem(KEY_ADMINS, JSON.stringify(admins));
  },

  resetAdminAccess: async (adminId: string): Promise<void> => {
    await delay(400);
    const admins = await MockService.getAdminList();
    const index = admins.findIndex(a => a.id === adminId);
    
    if (index !== -1) {
      admins[index].password = null; // Reset to force setup
      localStorage.setItem(KEY_ADMINS, JSON.stringify(admins));
    }
  },

  // --- Student Auth ---
  loginStudent: async (email: string): Promise<User | null> => {
    await delay(500);
    const users = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    // Simplified student login for demo (just checks email existence)
    // In production, students should also have passwords
    const user = users.find((u: User) => u.email === email);
    return user || null;
  },

  register: async (userData: Omit<User, 'id' | 'role' | 'completedModules'> & { password?: string }): Promise<User> => {
    await delay(800);
    const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    
    if (users.find(u => u.email === userData.email)) {
      throw new Error('El correo ya está registrado');
    }

    const { password, ...safeUserData } = userData;

    const newUser: User = {
      ...safeUserData,
      id: Math.random().toString(36).substr(2, 9),
      role: UserRole.STUDENT,
      completedModules: []
    };

    users.push(newUser);
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
    
    MockService.addNotification(newUser.id, '¡Bienvenido a tu catequesis digital! Comienza con el Módulo 1.');

    return newUser;
  },
  
  updateUser: async (updatedUser: User): Promise<void> => {
    await delay(500);
    const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    const index = users.findIndex(u => u.id === updatedUser.id);
    
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(KEY_USERS, JSON.stringify(users));
    } else {
      throw new Error("Usuario no encontrado para actualización.");
    }
  },

  // --- Content ---
  getModules: async (): Promise<Module[]> => {
    await delay(300);
    const stored = localStorage.getItem(KEY_MODULES);
    if (!stored) {
      localStorage.setItem(KEY_MODULES, JSON.stringify(INITIAL_MODULES));
      return INITIAL_MODULES;
    }
    return JSON.parse(stored);
  },

  updateModule: async (updatedModule: Module): Promise<void> => {
    await delay(500);
    const modules = await MockService.getModules();
    const index = modules.findIndex(m => m.id === updatedModule.id);
    
    if (index !== -1) {
      modules[index] = updatedModule;
    } else {
      modules.push(updatedModule);
    }
    
    localStorage.setItem(KEY_MODULES, JSON.stringify(modules));
  },

  getAppConfig: (): AppConfig => {
    const defaultConf: AppConfig = { 
        heroImage: 'https://picsum.photos/1200/400',
        landingBackground: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1000',
        primaryColor: 'blue' 
    };
    return JSON.parse(localStorage.getItem(KEY_CONFIG) || JSON.stringify(defaultConf));
  },

  updateAppConfig: async (config: AppConfig) => {
    await delay(200);
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  },

  // --- Logic & Attempts ---
  getAttempts: (userId: string): QuizAttempt[] => {
    const allAttempts = JSON.parse(localStorage.getItem(KEY_ATTEMPTS) || '[]');
    return allAttempts.filter((a: any) => a.userId === userId);
  },

  submitQuiz: async (userId: string, moduleId: string, score: number): Promise<{ passed: boolean, lockedUntil?: number }> => {
    await delay(600);
    const passed = score >= 80;
    const now = Date.now();
    
    const attempt = { userId, moduleId, score, timestamp: now, passed };
    const allAttempts = JSON.parse(localStorage.getItem(KEY_ATTEMPTS) || '[]');
    allAttempts.push(attempt);
    localStorage.setItem(KEY_ATTEMPTS, JSON.stringify(allAttempts));

    if (passed) {
      const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
      const userIdx = users.findIndex(u => u.id === userId);
      if (userIdx !== -1) {
        if (!users[userIdx].completedModules.includes(moduleId)) {
          users[userIdx].completedModules.push(moduleId);
          localStorage.setItem(KEY_USERS, JSON.stringify(users));
        }
      }
      MockService.addNotification(userId, `¡Felicidades! Aprobaste el módulo con ${score}%.`);
    } else {
      MockService.addNotification(userId, `Has reprobado el examen (${score}%). Bloqueado por 48 horas.`, 'alert');
    }

    return { 
      passed, 
      lockedUntil: passed ? undefined : now + (48 * 60 * 60 * 1000) 
    };
  },

  // --- Stats ---
  getAllUsers: async (): Promise<User[]> => {
    await delay(400);
    return JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  },

  deleteUser: async (userId: string): Promise<void> => {
    await delay(500);
    let users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  },

  // --- Notifications & Broadcasts ---
  getNotifications: (userId: string): Notification[] => {
    const all = JSON.parse(localStorage.getItem(KEY_NOTIFICATIONS) || '[]');
    return all.filter((n: any) => n.userId === userId).sort((a: any, b: any) => b.timestamp - a.timestamp);
  },

  addNotification: (userId: string, message: string, type: 'info'|'success'|'alert'|'message' = 'info') => {
    const all = JSON.parse(localStorage.getItem(KEY_NOTIFICATIONS) || '[]');
    all.push({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      message,
      read: false,
      timestamp: Date.now(),
      type
    });
    localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(all));
  },

  sendBroadcast: async (title: string, body: string, importance: 'normal' | 'high'): Promise<void> => {
    await delay(600);
    const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    const students = users.filter(u => u.role === UserRole.STUDENT);
    
    const notificationType = importance === 'high' ? 'alert' : 'message';
    const fullMessage = `${title}: ${body}`;

    // Add notification to all students
    students.forEach(student => {
      MockService.addNotification(student.id, fullMessage, notificationType);
    });

    // Save history
    const history: Broadcast[] = JSON.parse(localStorage.getItem(KEY_BROADCASTS) || '[]');
    history.unshift({
      id: Date.now().toString(),
      title,
      body,
      importance,
      sentAt: Date.now(),
      recipientsCount: students.length
    });
    localStorage.setItem(KEY_BROADCASTS, JSON.stringify(history));
  },

  getBroadcastHistory: async (): Promise<Broadcast[]> => {
    await delay(200);
    return JSON.parse(localStorage.getItem(KEY_BROADCASTS) || '[]');
  },

  // --- Calendar Events ---
  getEvents: async (): Promise<CalendarEvent[]> => {
    await delay(300);
    return JSON.parse(localStorage.getItem(KEY_EVENTS) || '[]');
  },

  addEvent: async (event: CalendarEvent): Promise<void> => {
    await delay(400);
    const events = await MockService.getEvents();
    events.push(event);
    localStorage.setItem(KEY_EVENTS, JSON.stringify(events));
  }
};
